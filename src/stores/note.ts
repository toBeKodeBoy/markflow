import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStorage } from '../composables/useStorage'
import { useAppSettings } from '../composables/useAppSettings'
import { getAssetStorage } from '../composables/useAssetStorage'
import { collectAllNoteContents } from '../utils/resolveMarkdownAssets'
import { LARGE_FILE_THRESHOLD } from '../constants'
import { applyTocToContent } from '../utils/generateTocMarkdown'
import { migrateLegacyPathFolders, collectDescendantFolderIds, collectAncestorFolderIds, nextSiblingOrder, wouldCreateFolderCycle, getFolderDeleteImpact, reorderSiblingFolders, validateFolderDepth } from '../utils/folderTree'
import { buildBackupAsync, applyBackup, parseBackup, downloadBackupJson, type MarkFlowBackup } from '../utils/backup'
import { planSortOrderMigration } from '../utils/migrateNoteSortOrder'
import { sortNotes } from '../utils/noteSort'
import { runFolderImport, saveImportImageAsAsset } from '../utils/importFolderService'
import { getOrCreateTitleSet } from '../utils/importFolderHelpers'
import { importMarkdownImages } from '../utils/importMarkdownImages'
import { extractAssetIds } from '../utils/assetUri'
import { sanitizeFilename } from '../utils/exportPdf'
import { renderPathTemplate } from '../utils/pathTemplate'
import type { ImportFolderOptions, ImportFolderProgress, ImportFolderResult, ImportFolderScanResult } from '../types/import'
import type { Note, NoteListItem, Folder, TocJumpTarget, EditorContentPush, ImportedMarkdownFile, TrashNote, TrashFolderEntry } from '../types'
import { extractNoteTitle } from '../utils/noteTitle'
import { getTabContentCache, setTabContentCache } from './tabContentCache'
import { notifyNoteDeleted, notifyLibraryReset } from './editorTabsBridge'
import { touchRecentNote, clearRecentNote } from '../utils/recentNotes'
import { showAppNotification } from '../utils/notify'

/** 显示通知（封装 showAppNotification） */
function showNotification(message: string) {
  showAppNotification(message)
}

/** 将笔记正文规范化为可搜索文本（小写），截断到 2000 字节省内存 */
function normalizeForSearch(text: string): string {
  const lower = text.toLowerCase()
  return lower.length > 2000 ? lower.slice(0, 2000) : lower
}

/** 生成唯一 ID：当前时间戳(36进制) + 随机数(36进制) */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

const extractTitle = extractNoteTitle

interface CreateNoteWithContentOptions {
  folderId?: string
  sourceFilePath?: string
  workingFilePath?: string
  assetDirectoryPath?: string
  assetDirectoryTemplate?: string
  assetPathMode?: 'internal' | 'file-bound'
  assetLinkStyle?: 'absolute' | 'relative'
  title?: string
  titleLockedFromSource?: boolean
}

interface ImportMarkdownFileResult {
  note: Note
  imagesImported: number
  warnings: string[]
}

function shouldKeepImportedTitle(note: Pick<Note, 'titleLockedFromSource' | 'importSourcePath' | 'sourceFilePath'>): boolean {
  return !!(note.titleLockedFromSource || note.importSourcePath || note.sourceFilePath)
}

function mergeManagedAssetIds(note: Note, content: string): void {
  const next = new Set(note.managedAssetIds ?? [])
  for (const assetId of extractAssetIds(content)) {
    next.add(assetId)
  }
  note.managedAssetIds = [...next]
}

function dirname(path: string): string {
  const normalized = path.replace(/\//g, '\\')
  const idx = normalized.lastIndexOf('\\')
  return idx > 0 ? normalized.slice(0, idx) : normalized
}

function joinWindowsPath(base: string, name: string): string {
  return `${base.replace(/[\\/]+$/, '')}\\${name.replace(/^[\\/]+/, '')}`
}

function buildWorkingFilePath(currentPath: string, title: string): string {
  return joinWindowsPath(dirname(currentPath), `${sanitizeFilename(title)}.md`)
}

function buildAssetDirectoryPath(
  workingFilePath: string,
  template: string,
  title: string
): string {
  const rendered = renderPathTemplate(template, {
    filename: workingFilePath.replace(/\//g, '\\').split('\\').pop()?.replace(/\.md$/i, '') ?? '',
    noteTitle: title,
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 8).replace(/:/g, ''),
  })
  if (/^[A-Za-z]:[\\/]/.test(rendered)) {
    return rendered.replace(/\//g, '\\')
  }
  const normalizedRelative = rendered.replace(/^\.\//, '').replace(/^\.[\\]/, '')
  return joinWindowsPath(dirname(workingFilePath), normalizedRelative)
}

function rewriteAssetDirectoryRefs(content: string, oldDirName: string, newDirName: string): string {
  const escaped = oldDirName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return content.replace(new RegExp(escaped, 'g'), newDirName)
}

export const useNoteStore = defineStore('note', () => {
  const storage = useStorage()

  const noteList = ref<NoteListItem[]>([])
  const currentNote = ref<Note | null>(null)
  const liveContent = ref('')
  const folderList = ref<Folder[]>([])
  const searchQuery = ref('')
  const activeFolderId = ref<string | null>(null)
  /** 回收站版本号：任何回收站变更后递增，驱动面板/角标等 computed 重新计算 */
  const trashVersion = ref(0)
  /** 递增时 Sidebar 从 settings 重载展开/选中状态 */
  const sidebarStateRevision = ref(0)
  /** 笔记正文搜索索引（id → 小写正文），loadNoteList 时重建 */
  const contentSearchIndex = ref<Record<string, string>>({})
  const tocVisible = ref(false)
  const tocJumpTarget = ref<TocJumpTarget | null>(null)
  const editorContentPush = ref<EditorContentPush | null>(null)
  const pendingLargeFileSwitch = ref(false)
  /** 回收站容量上限 */
  const TRASH_MAX_ITEMS = 200
  let tocJumpSeq = 0
  let editorContentPushSeq = 0

  /** 根据 searchQuery 过滤（不含文件夹筛选） */
  const searchedNoteList = computed(() => {
    let list = noteList.value
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (contentSearchIndex.value[n.id]?.includes(q) ?? false)
      )
    }
    return list
  })

  /** 根据 activeFolderId 和 searchQuery 过滤后的笔记列表 */
  const filteredNoteList = computed(() => {
    let list = searchedNoteList.value
    if (activeFolderId.value) {
      list = list.filter(n => n.folderId === activeFolderId.value)
    }
    return sortNotes(list)
  })

  /** 大文件策略：内容长度超过阈值时标记 pendingLargeFileSwitch */
  function applyLargeFilePolicy(content: string) {
    if (content.length > LARGE_FILE_THRESHOLD) {
      pendingLargeFileSwitch.value = true
    }
  }

  /** 清除大文件切换标记 */
  function clearPendingLargeFileSwitch() {
    pendingLargeFileSwitch.value = false
  }

  /** 设置目录面板显隐状态 */
  function setTocVisible(visible: boolean) {
    tocVisible.value = visible
  }

  /** 更新单篇笔记的正文搜索索引 */
  function updateSearchIndex(id: string, content: string) {
    contentSearchIndex.value = {
      ...contentSearchIndex.value,
      [id]: normalizeForSearch(content),
    }
  }

  /** 从存储重建全部笔记的正文搜索索引 */
  function rebuildSearchIndex() {
    const index: Record<string, string> = {}
    for (const item of noteList.value) {
      const note = storage.getNote(item.id)
      if (note?.content) index[item.id] = normalizeForSearch(note.content)
    }
    contentSearchIndex.value = index
  }

  /** 从存储加载笔记列表和文件夹列表 */
  function loadNoteList() {
    noteList.value = storage.getNoteList()
    const sortMigration = planSortOrderMigration(noteList.value)
    if (sortMigration.length > 0) {
      for (const { id, sortOrder } of sortMigration) {
        const note = storage.getNote(id)
        if (!note) continue
        note.sortOrder = sortOrder
        storage.saveNote(note)
      }
      noteList.value = storage.getNoteList()
    }
    const rawFolders = storage.getFolderList()
    const { folders, changed } = migrateLegacyPathFolders(rawFolders)
    folderList.value = folders
    if (changed) storage.saveFolderList(folders)
    rebuildSearchIndex()
  }

  /** 打开指定笔记：从存储读取完整内容，设为当前，检查大文件策略 */
  function openNote(id: string) {
    const note = storage.getNote(id)
    if (note) {
      setActiveNote(note, note.content)
      applyLargeFilePolicy(note.content)
    }
  }

  /** 激活指定笔记到编辑器（不改变 Tab 列表，由 editorTabs 调用） */
  function setActiveNote(note: Note | null, content: string) {
    currentNote.value = note
    liveContent.value = content
  }

  /** 设置实时编辑内容（不持久化） */
  function setLiveContent(content: string) {
    liveContent.value = content
    if (currentNote.value) setTabContentCache(currentNote.value.id, content)
  }

  /** 持久化指定笔记正文（支持非当前 Tab） */
  function updateNoteContent(noteId: string, content: string) {
    const note = storage.getNote(noteId)
    if (!note) return
    const keepImportedTitle = shouldKeepImportedTitle(note)
    const title = keepImportedTitle ? note.title : extractTitle(content)
    note.content = content
    note.title = title
    mergeManagedAssetIds(note, content)
    note.updatedAt = Date.now()
    storage.saveNote(note)
    updateSearchIndex(noteId, content)
    const idx = noteList.value.findIndex((n) => n.id === noteId)
    if (idx >= 0) {
      noteList.value[idx].title = title
      noteList.value[idx].updatedAt = note.updatedAt
    }
    if (currentNote.value?.id === noteId) {
      currentNote.value.content = content
      currentNote.value.title = title
      currentNote.value.updatedAt = note.updatedAt
      liveContent.value = content
    }
    touchRecentNote(noteId, note.updatedAt)
  }

  /** 创建空白笔记，保存到存储，设为当前 */
  function createNote(folderId?: string) {
    const now = Date.now()
    const note: Note = {
      id: generateId(),
      title: '无标题',
      content: '# 无标题\n\n',
      folderId,
      assetPathMode: 'internal',
      createdAt: now,
      updatedAt: now
    }
    storage.saveNote(note)
    noteList.value = storage.getNoteList()
    updateSearchIndex(note.id, note.content)
    currentNote.value = note
    liveContent.value = note.content
    return note
  }

  /** 以指定内容创建笔记，自动提取标题，保存并设为当前 */
  function createNoteWithContent(content: string, folderIdOrOptions?: string | CreateNoteWithContentOptions) {
    const options =
      typeof folderIdOrOptions === 'string'
        ? { folderId: folderIdOrOptions }
        : (folderIdOrOptions ?? {})
    const now = Date.now()
    const title = options.title ?? extractTitle(content)
    const note: Note = {
      id: generateId(),
      title,
      content,
      folderId: options.folderId,
      sourceFilePath: options.sourceFilePath,
      workingFilePath: options.workingFilePath,
      assetDirectoryPath: options.assetDirectoryPath,
      assetDirectoryTemplate: options.assetDirectoryTemplate,
      assetPathMode: options.assetPathMode ?? 'internal',
      assetLinkStyle: options.assetLinkStyle,
      managedAssetIds: extractAssetIds(content),
      titleLockedFromSource: options.titleLockedFromSource,
      createdAt: now,
      updatedAt: now
    }
    storage.saveNote(note)
    noteList.value = storage.getNoteList()
    updateSearchIndex(note.id, content)
    currentNote.value = note
    liveContent.value = content
    applyLargeFilePolicy(content)
    return note
  }

  async function importMarkdownFile(
    file: ImportedMarkdownFile,
    folderId?: string
  ): Promise<ImportMarkdownFileResult> {
    const assetStorage = getAssetStorage()
    const result = await importMarkdownImages(
      file.content,
      file.images,
      (base64, mime, filename) =>
        saveImportImageAsAsset(base64, mime, filename, assetStorage.saveFromBlob)
    )

    const note = createNoteWithContent(result.content, {
      folderId,
      title: extractTitle(result.content, file.name),
      sourceFilePath: file.path,
      titleLockedFromSource: true,
    })

    return {
      note,
      imagesImported: result.imagesImported,
      warnings: result.warnings,
    }
  }

  /** 保存当前笔记内容变更（title/content/updatedAt），同步更新 noteList */
  function updateCurrentContent(content: string) {
    if (!currentNote.value) return
    updateNoteContent(currentNote.value.id, content)
  }

  function applyExternalContentUpdate(content: string) {
    if (!currentNote.value) return false
    liveContent.value = content
    setTabContentCache(currentNote.value.id, content)
    updateCurrentContent(content)
    editorContentPush.value = { content, id: ++editorContentPushSeq }
    return true
  }

  /** 内部硬删除逻辑（不经过回收站，用于软删除时实际移除） */
  function _hardDeleteNoteInternal(id: string) {
    storage.removeNote(id)
    noteList.value = storage.getNoteList()
    const nextIndex = { ...contentSearchIndex.value }
    delete nextIndex[id]
    contentSearchIndex.value = nextIndex
    clearRecentNote(id)
    if (currentNote.value?.id === id) {
      currentNote.value = null
      liveContent.value = ''
      editorContentPush.value = { content: '', id: ++editorContentPushSeq }
    }
    notifyNoteDeleted(id)
  }

  /** 软删除笔记：移入回收站而非永久删除 */
  function softDeleteNote(id: string) {
    // 1. 检查回收站容量
    const trashNotes = storage.getTrashNotes()
    if (trashNotes.length >= TRASH_MAX_ITEMS) {
      showNotification('回收站已满，请先清空部分笔记')
      return
    }
    
    // 2. 读取原笔记内容
    const note = storage.getNote(id)
    if (!note) return
    
    // 3. 构建 TrashNote 对象
    const trashNote: TrashNote = {
      ...note,
      deletedAt: Date.now(),
      deletedBy: 'user' as const
    }
    
    // 4. 保存到回收站
    storage.saveTrashNote(trashNote)
    
    // 5. 从主列表移除（调用硬删除逻辑）
    _hardDeleteNoteInternal(id)
    trashVersion.value++
  }

  /** 恢复回收站笔记到主列表 */
  function restoreNote(id: string): Note | null {
    // 1. 从存储层恢复（已包含重建逻辑）
    const restored = storage.restoreTrashNote(id)
    if (!restored) return null
    
    // 2. 刷新主列表
    noteList.value = storage.getNoteList()
    
    // 3. 重建搜索索引
    rebuildSearchIndex()
    
    // 4. 自动导航到恢复的笔记
    setActiveNote(restored, restored.content)
    trashVersion.value++
    
    return restored
  }

  function collectRemainingNoteContents(): string[] {
    const activeContents = collectAllNoteContents(
      () => noteList.value,
      (id) => storage.getNote(id),
    )
    const trashContents = storage.getTrashNotes().map((note) => note.content).filter(Boolean)
    return [...activeContents, ...trashContents]
  }

  function scheduleAssetGc(contents = collectRemainingNoteContents()): void {
    try {
      void getAssetStorage().gcOrphans(contents)
    } catch {
      // 资源清理失败不阻塞元数据操作
    }
  }

  /** 永久删除笔记（从回收站彻底清除） */
  function permanentDeleteNote(id: string) {
    storage.permanentlyDeleteNote(id)
    noteList.value = storage.getNoteList()
    rebuildSearchIndex()
    scheduleAssetGc()
    trashVersion.value++
  }

  /** 清空整个回收站 */
  function clearTrash() {
    storage.clearTrash()
    triggerTrashRefresh()
    scheduleAssetGc()
  }

  /** 获取回收站笔记列表（按删除时间倒序） */
  function getTrashNotes(): TrashNote[] {
    const notes = storage.getTrashNotes()
    return notes.sort((a, b) => ((b.deletedAt ?? 0) - (a.deletedAt ?? 0)))
  }

  /** 触发回收站 UI 刷新 */
  function triggerTrashRefresh() {
    noteList.value = storage.getNoteList()
    rebuildSearchIndex()
    trashVersion.value++
  }

  /** 自动清理超过 N 天的回收站笔记 */
  async function purgeOldTrash(maxDays: number = 30) {
    const safeDays = Number.isInteger(maxDays) && maxDays >= 1 && maxDays <= 3650 ? maxDays : 30
    const cutoffDate = Date.now() - safeDays * 24 * 60 * 60 * 1000
    const oldNotes = storage.getTrashNotes().filter(
      (note) => typeof note.deletedAt === 'number' && note.deletedAt < cutoffDate,
    )

    for (const note of oldNotes) {
      const current = storage.getTrashNotes().find((candidate) => candidate.id === note.id)
      if (current?.deletedAt !== note.deletedAt) continue
      await storage.permanentlyDeleteNote(note.id)
    }
    if (oldNotes.length > 0) {
      triggerTrashRefresh()
      scheduleAssetGc()
    }
  }
  
  /** 检查是否可以向回收站添加新笔记 */
  function canAddToTrash(): boolean {
    return storage.getTrashNotes().length < TRASH_MAX_ITEMS
  }

  // ===== 文件夹回收站方法 =====

  /** 软删除文件夹：将文件夹及其子文件夹移入回收站，子树内笔记也一并软删除 */
  function softDeleteFolder(id: string) {
    // 1. 收集子树
    const target = folderList.value.find(f => f.id === id)
    if (!target) return
    const descendantIds = collectDescendantFolderIds(id, folderList.value)
    const descendantFolders = folderList.value.filter(f => descendantIds.has(f.id))
    // 3. 收集子树内笔记 ID
    const noteIdsInSubtree = noteList.value
      .filter(n => !!n.folderId && descendantIds.has(n.folderId!))
      .map(n => n.id)
    // 修复（Code Review #7）：容量检查统一计算文件夹 + 笔记条目总数
    const trashFolders = storage.getTrashFolders()
    const trashNotes = storage.getTrashNotes()
    const totalAfter = trashFolders.length + trashNotes.length + descendantFolders.length + noteIdsInSubtree.length + 1
    if (totalAfter > TRASH_MAX_ITEMS) {
      showNotification('回收站容量不足，请先清空部分条目')
      return
    }
    // 4. 构建 TrashFolderEntry 快照
    const entry: TrashFolderEntry = {
      folder: { ...target },
      descendantFolders: descendantFolders.filter(f => f.id !== id).map(f => ({ ...f })),
      noteIds: noteIdsInSubtree,
      deletedAt: Date.now(),
      deletedBy: 'user' as const,
      originalParentId: target.parentId,
    }
    // 5. 保存到回收站
    storage.saveTrashFolderEntry(entry)
    // 6. 子树笔记软删除（跳过单条容量检查，直接写入回收站再硬删除）
    for (const noteId of noteIdsInSubtree) {
      const note = storage.getNote(noteId)
      if (note) {
        const trashNote: TrashNote = { ...note, deletedAt: Date.now(), deletedBy: 'user' as const }
        storage.saveTrashNote(trashNote)
        _hardDeleteNoteInternal(noteId)
      }
    }
    // 7. 从 folderList 移除子树
    folderList.value = folderList.value.filter(f => !descendantIds.has(f.id))
    storage.saveFolderList(folderList.value)
    // 8. 更新当前笔记/文件夹引用
    if (currentNote.value?.folderId && descendantIds.has(currentNote.value.folderId)) {
      currentNote.value.folderId = target.parentId
    }
    if (activeFolderId.value && descendantIds.has(activeFolderId.value)) {
      activeFolderId.value = null
    }
  }

  /** 恢复文件夹到原父级（原父级不存在时恢复到根目录） */
  function restoreFolder(id: string): Folder | null {
    // 修复（Code Review #8）：先读取快照（不删除），写入 folderList 成功后再从回收站移除，避免中途失败导致数据丢失
    const entry = storage.getTrashFolders().find(e => e.folder.id === id)
    if (!entry) return null
    // 2. 恢复文件夹子树
    const foldersToRestore = [entry.folder, ...entry.descendantFolders]
    const restoredIds = new Set(foldersToRestore.map((folder) => folder.id))
    if (foldersToRestore.some((folder) => folderList.value.some((active) => active.id === folder.id))) {
      return null
    }
    // 检查原父级是否存在，且快照内部父级引用完整
    const parentIdsValid = foldersToRestore.every(
      (folder) => !folder.parentId || restoredIds.has(folder.parentId) || folder.parentId === entry.originalParentId,
    )
    if (!parentIdsValid) return null
    const parentExists = !entry.originalParentId || folderList.value.some(f => f.id === entry.originalParentId)
    if (!parentExists) {
      entry.folder.parentId = undefined
    }
    folderList.value = [...folderList.value, ...foldersToRestore]
    storage.saveFolderList(folderList.value)
    // 3. 写入成功后，从回收站移除
    storage.removeTrashFolder(id)
    // 4. 恢复关联笔记
    for (const noteId of entry.noteIds) {
      storage.restoreTrashNote(noteId)
    }
    // 5. 刷新主列表
    noteList.value = storage.getNoteList()
    rebuildSearchIndex()
    triggerTrashRefresh()
    return entry.folder
  }

  /** 永久删除文件夹（从回收站彻底清除，关联笔记也一并永久删除） */
  function permanentDeleteFolder(id: string) {
    const entry = storage.getTrashFolders().find(e => e.folder.id === id)
    if (!entry) return
    // 修复（Code Review #2）：仅删除仍留在笔记回收站中的笔记，
    // 避免误删用户已单独恢复到主列表的笔记
    const trashNoteIds = new Set(storage.getTrashNotes().map(n => n.id))
    for (const noteId of entry.noteIds) {
      if (trashNoteIds.has(noteId)) {
        storage.permanentlyDeleteNote(noteId)
      }
    }
    // 从回收站移除
    storage.permanentlyDeleteFolder(id)
    noteList.value = storage.getNoteList()
    rebuildSearchIndex()
    scheduleAssetGc()
    trashVersion.value++
  }

  /** 清空全部文件夹回收站 */
  function clearTrashFolders() {
    storage.clearTrashFolders()
    triggerTrashRefresh()
    scheduleAssetGc()
  }

  /** 获取文件夹回收站列表（按删除时间倒序） */
  function getTrashFolders(): TrashFolderEntry[] {
    const entries = storage.getTrashFolders()
    return entries.sort((a, b) => b.deletedAt - a.deletedAt)
  }

  /** 自动清理超过 N 天的文件夹回收站条目 */
  async function purgeOldTrashFolders(maxDays: number = 30) {
    const safeDays = Number.isInteger(maxDays) && maxDays >= 1 && maxDays <= 3650 ? maxDays : 30
    const cutoffDate = Date.now() - safeDays * 24 * 60 * 60 * 1000
    const oldEntries = storage.getTrashFolders().filter(
      (entry) => typeof entry.deletedAt === 'number' && entry.deletedAt < cutoffDate,
    )
    for (const entry of oldEntries) {
      const current = storage.getTrashFolders().find(
        (candidate) => candidate.folder.id === entry.folder.id,
      )
      if (current?.deletedAt !== entry.deletedAt) continue
      permanentDeleteFolder(entry.folder.id)
    }
  }

  /** 删除笔记：标记为软删除（移入回收站） */
  function deleteNote(id: string) {
    softDeleteNote(id)
  }

  /** 重命名笔记并更新存储 */
  function renameNote(id: string, title: string) {
    const note = storage.getNote(id)
    if (!note) return
    const oldAssetDirectoryPath = note.assetDirectoryPath
    note.title = title
    note.updatedAt = Date.now()
    delete note.importSourcePath
    delete note.sourceFilePath
    note.titleLockedFromSource = false

    const shouldMigrateBoundPaths =
      note.assetPathMode === 'file-bound'
      && !!note.workingFilePath
      && !!note.assetDirectoryPath
      && !!note.assetDirectoryTemplate
      && note.assetDirectoryTemplate.includes('${filename}')
      && !!window.markflow.movePath

    if (shouldMigrateBoundPaths) {
      const nextWorkingFilePath = buildWorkingFilePath(note.workingFilePath!, title)
      const nextAssetDirectoryPath = buildAssetDirectoryPath(
        nextWorkingFilePath,
        note.assetDirectoryTemplate!,
        title
      )
      const workingConflict = window.markflow.pathExists?.(nextWorkingFilePath) ?? false
      const assetConflict = window.markflow.pathExists?.(nextAssetDirectoryPath) ?? false

      if (
        !workingConflict
        && !assetConflict
        && nextWorkingFilePath !== note.workingFilePath
        && nextAssetDirectoryPath !== note.assetDirectoryPath
      ) {
        const moveAssetResult = window.markflow.movePath?.(note.assetDirectoryPath!, nextAssetDirectoryPath)
        const moveFileResult = window.markflow.movePath?.(note.workingFilePath!, nextWorkingFilePath)
        if (moveAssetResult?.ok && moveFileResult?.ok) {
          const oldDirName = oldAssetDirectoryPath!.replace(/\//g, '\\').split('\\').pop() ?? ''
          const newDirName = nextAssetDirectoryPath.replace(/\//g, '\\').split('\\').pop() ?? ''
          note.content = rewriteAssetDirectoryRefs(note.content, oldDirName, newDirName)
          note.workingFilePath = nextWorkingFilePath
          note.assetDirectoryPath = nextAssetDirectoryPath
          if (window.markflow.writeTextFile) {
            window.markflow.writeTextFile(nextWorkingFilePath, note.content)
          }
        }
      }
    }

    storage.saveNote(note)
    noteList.value = storage.getNoteList()
    if (currentNote.value?.id === id) {
      currentNote.value.title = title
      currentNote.value.content = note.content
      currentNote.value.workingFilePath = note.workingFilePath
      currentNote.value.assetDirectoryPath = note.assetDirectoryPath
      currentNote.value.assetDirectoryTemplate = note.assetDirectoryTemplate
      delete currentNote.value.importSourcePath
      delete currentNote.value.sourceFilePath
      currentNote.value.titleLockedFromSource = false
    }
  }

  function bindNoteToWorkingFile(
    noteId: string,
    payload: {
      workingFilePath: string
      assetDirectoryPath: string
      assetDirectoryTemplate?: string
      assetLinkStyle: 'absolute' | 'relative'
      content: string
    }
  ) {
    const note = storage.getNote(noteId)
    if (!note) return
    note.workingFilePath = payload.workingFilePath
    note.assetDirectoryPath = payload.assetDirectoryPath
    note.assetDirectoryTemplate = payload.assetDirectoryTemplate
    note.assetPathMode = 'file-bound'
    note.assetLinkStyle = payload.assetLinkStyle
    note.content = payload.content
    mergeManagedAssetIds(note, payload.content)
    note.updatedAt = Date.now()
    storage.saveNote(note)
    updateSearchIndex(noteId, payload.content)
    const idx = noteList.value.findIndex((n) => n.id === noteId)
    if (idx >= 0) {
      noteList.value[idx].title = note.title
      noteList.value[idx].updatedAt = note.updatedAt
    }
    if (currentNote.value?.id === noteId) {
      currentNote.value = { ...note }
      liveContent.value = payload.content
    }
  }

  /** 将笔记排到目标文件夹末尾（同级 sortOrder） */
  function bumpNoteSortOrder(id: string, folderId: string | undefined) {
    const note = storage.getNote(id)
    if (!note) return
    const siblings = noteList.value.filter((n) => n.folderId === folderId && n.id !== id)
    const maxOrder = siblings.reduce((max, n) => Math.max(max, n.sortOrder ?? 0), 0)
    note.sortOrder = maxOrder + 1
    note.updatedAt = Date.now()
    storage.saveNote(note)
    noteList.value = storage.getNoteList()
    if (currentNote.value?.id === id) {
      currentNote.value.sortOrder = note.sortOrder
      currentNote.value.updatedAt = note.updatedAt
    }
  }

  /** 移动笔记到指定文件夹 */
  function moveNote(id: string, folderId: string | undefined) {
    const note = storage.getNote(id)
    if (!note) return
    if (note.folderId === folderId) {
      bumpNoteSortOrder(id, folderId)
      return
    }

    note.folderId = folderId
    note.sortOrder = undefined
    note.updatedAt = Date.now()
    storage.saveNote(note)
    noteList.value = storage.getNoteList()
    bumpNoteSortOrder(id, folderId)

    if (currentNote.value?.id === id) {
      currentNote.value.folderId = folderId
      currentNote.value.sortOrder = note.sortOrder
    }
  }

  /** 创建文件夹并持久化；超过最大嵌套层级时返回 null */
  function createFolder(name: string, parentId?: string): Folder | null {
    // 修复（Code Review #4）：接入深度校验，限制最大嵌套层级
    if (!validateFolderDepth(folderList.value, parentId, 20)) {
      showNotification('已达最大嵌套层级（20 级），无法创建子文件夹')
      return null
    }
    const folder: Folder = {
      id: generateId(),
      name,
      order: nextSiblingOrder(folderList.value, parentId),
      parentId,
    }
    folderList.value.push(folder)
    storage.saveFolderList(folderList.value)
    return folder
  }

  /** 移动文件夹到新的父级；同父级时排到末尾 */
  function moveFolder(id: string, newParentId: string | undefined): boolean {
    if (wouldCreateFolderCycle(folderList.value, id, newParentId)) return false
    const folder = folderList.value.find((f) => f.id === id)
    if (!folder) return false
    if (folder.parentId !== newParentId) {
      // 修复（Code Review #4）：移动可能绕过创建时的深度限制，需一并校验
      if (!validateFolderDepth(folderList.value, newParentId, 20)) {
        showNotification('已达最大嵌套层级（20 级），无法移动到该位置')
        return false
      }
    }
    if (folder.parentId === newParentId) {
      folder.order = nextSiblingOrder(folderList.value, newParentId, id)
      storage.saveFolderList(folderList.value)
      return true
    }
    folder.parentId = newParentId
    folder.order = nextSiblingOrder(folderList.value, newParentId, id)
    storage.saveFolderList(folderList.value)
    return true
  }

  /** 删除文件夹：标记为软删除（移入回收站） */
  function deleteFolder(id: string) {
    softDeleteFolder(id)
  }

  /** 删除前影响统计 */
  function getDeleteFolderImpact(folderId: string) {
    return getFolderDeleteImpact(folderList.value, noteList.value, folderId)
  }

  /** 请求跳转到目录指定标题：递增 seq 触发 watcher */
  function requestTocJump(line: number, index: number) {
    tocJumpTarget.value = { line, index, id: ++tocJumpSeq }
  }

  /** 将目录块插入当前笔记；成功返回 true */
  function insertAutoToc(): boolean {
    if (!currentNote.value) return false
    const content = liveContent.value || currentNote.value.content
    const next = applyTocToContent(content)
    if (next === content) return false
    liveContent.value = next
    updateCurrentContent(next)
    editorContentPush.value = { content: next, id: ++editorContentPushSeq }
    return true
  }

  function reorderNotes(folderId: string | undefined, orderedIds: string[]): void {
    const baseTime = Date.now()
    const pinnedIds = orderedIds.filter((id) => {
      const note = storage.getNote(id)
      return note != null && note.folderId === folderId && note.pinned
    })
    const unpinnedIds = orderedIds.filter((id) => {
      const note = storage.getNote(id)
      return note != null && note.folderId === folderId && !note.pinned
    })

    pinnedIds.forEach((id, index) => {
      const note = storage.getNote(id)
      if (!note) return
      // pinned 组内按 updatedAt 倒序；越靠前 updatedAt 越大
      note.updatedAt = baseTime - index
      storage.saveNote(note)
    })

    unpinnedIds.forEach((id, index) => {
      const note = storage.getNote(id)
      if (!note) return
      note.sortOrder = (index + 1) * 100
      note.updatedAt = baseTime
      storage.saveNote(note)
    })

    noteList.value = storage.getNoteList()
  }

  /** 切换笔记置顶 */
  function toggleNotePinned(id: string) {
    const note = storage.getNote(id)
    if (!note) return
    note.pinned = !note.pinned
    note.updatedAt = Date.now()
    storage.saveNote(note)
    noteList.value = storage.getNoteList()
    if (currentNote.value?.id === id) currentNote.value.pinned = note.pinned
  }

  /** 导出全量备份 JSON（含 IndexedDB / uTools 图片资源） */
  async function exportLibraryBackup(): Promise<MarkFlowBackup> {
    const assetStorage = getAssetStorage()
    return buildBackupAsync(storage, {
      getIndex: () => assetStorage.getAssetIndex(),
      getAssetAsync: (id) => assetStorage.getAssetAsync(id),
    })
  }

  /** 下载备份文件 */
  async function downloadLibraryBackup() {
    downloadBackupJson(await exportLibraryBackup())
  }

  /** 从备份 JSON 恢复（清空旧图片资源） */
  async function restoreLibraryBackup(json: string) {
    const backup = parseBackup(json)
    const assetStorage = getAssetStorage()
    await assetStorage.clearAllAssets()
    applyBackup(backup, storage)
    useAppSettings().load()
    for (const item of backup.assets.index) {
      const record = backup.assets.records[item.id]
      if (record) await assetStorage.saveAssetAsync(item.id, record)
    }
    loadNoteList()
    activeFolderId.value = storage.getSettings().sidebarActiveFolderId ?? null
    searchQuery.value = ''
    sidebarStateRevision.value++
    notifyLibraryReset(noteList.value.length > 0 ? noteList.value[0].id : null)
    return backup
  }

  function notifySidebarStateChanged() {
    sidebarStateRevision.value++
  }

  /** 重命名文件夹并持久化 */
  function renameFolder(id: string, name: string) {
    const folder = folderList.value.find(f => f.id === id)
    if (folder) {
      folder.name = name
      storage.saveFolderList(folderList.value)
    }
  }

  // ===== 文件夹操作方法 =====

  /** 切换文件夹置顶状态（仅支持顶层文件夹） */
  function toggleFolderPinned(id: string) {
    const folder = folderList.value.find(f => f.id === id)
    if (!folder) return
    // 修复（R5）：子文件夹置顶不会出现在「常用文件夹」区，明确能力边界并提示用户
    if (!folder.pinned && folder.parentId) {
      showNotification('仅支持顶层文件夹置顶，请先移动到根目录')
      return
    }
    folder.pinned = !folder.pinned
    storage.saveFolderList(folderList.value)
  }

  /** 按指定顺序重排同级文件夹 */
  function reorderFolders(parentId: string | undefined, orderedIds: string[]): void {
    folderList.value = reorderSiblingFolders(folderList.value, parentId, orderedIds)
    storage.saveFolderList(folderList.value)
  }

  /** 克隆笔记：深拷贝内容，新 ID，标题含 _副本_ */
  function cloneNote(id: string): Note | null {
    const note = storage.getNote(id)
    if (!note) return null
    const now = Date.now()
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '') + new Date().toTimeString().slice(0, 8).replace(/:/g, '')
    // 修复（Code Review #9）：深拷贝时剥离外部文件绑定与资产归属字段，避免副本与原笔记争抢同一绑定关系
    const {
      workingFilePath: _workingFilePath,
      sourceFilePath: _sourceFilePath,
      importSourcePath: _importSourcePath,
      titleLockedFromSource: _titleLockedFromSource,
      ...base
    } = JSON.parse(JSON.stringify(note)) as Note
    const cloned: Note = {
      ...base,
      id: generateId(),
      title: note.title + `_副本_${timestamp}`,
      createdAt: now,
      updatedAt: now,
    }
    storage.saveNote(cloned)
    noteList.value = storage.getNoteList()
    rebuildSearchIndex()
    return cloned
  }

  /** 批量移动笔记到指定文件夹（使用 saveNoteBatch 批量写入） */
  function batchMoveNotes(ids: string[], folderId: string | undefined): void {
    const notes: Note[] = []
    let maxOrder = 0
    for (const id of ids) {
      const note = storage.getNote(id)
      if (!note) continue
      note.folderId = folderId
      note.sortOrder = maxOrder++
      note.updatedAt = Date.now()
      notes.push(note)
    }
    if (notes.length > 0) {
      storage.saveNoteBatch(notes)
      noteList.value = storage.getNoteList()
      rebuildSearchIndex()
    }
  }

  /** 返回笔记所属文件夹的祖先 ID 链（从根到父级，不含自身） */
  function locateNoteFolder(noteId: string): string[] {
    const note = noteList.value.find(n => n.id === noteId)
    if (!note || !note.folderId) return []
    return collectAncestorFolderIds(note.folderId, folderList.value)
  }

  /** 清空全部笔记、文件夹与图片资源（保留应用设置） */
  async function clearAllLibraryData() {
    const assetStorage = getAssetStorage()
    storage.clearAllNotesAndFolders()
    // 修复（Code Review #5）：清空书库/备份恢复替换模式时同步清空回收站，避免孤儿条目残留
    storage.clearTrash()
    storage.clearTrashFolders()
    useAppSettings().save({ recentNoteAccess: [] })
    await assetStorage.clearAllAssets()
    noteList.value = []
    folderList.value = []
    contentSearchIndex.value = {}
    currentNote.value = null
    liveContent.value = ''
    activeFolderId.value = null
    searchQuery.value = ''
    notifyLibraryReset(null)
  }

  /** 批量导入文件夹扫描结果 */
  async function batchImportFromFolder(
    scan: ImportFolderScanResult,
    options: ImportFolderOptions,
    onProgress?: (progress: ImportFolderProgress) => void
  ): Promise<ImportFolderResult> {
    if (options.replaceExisting) {
      await clearAllLibraryData()
    }

    const assetStorage = getAssetStorage()
    try {
      const result = await runFolderImport(scan, options, {
        getFolderList: () => folderList.value,
        saveFolderList: (list) => {
          folderList.value = list
          storage.saveFolderList(list)
        },
        saveNote: (note) => {
          storage.saveNote(note)
          updateSearchIndex(note.id, note.content)
        },
        saveNoteBatch: (notes) => {
          storage.saveNoteBatch(notes)
          for (const note of notes) {
            updateSearchIndex(note.id, note.content)
          }
        },
        onNotesCommitted: (notes) => {
          for (const note of notes) {
            noteList.value.push({
              id: note.id,
              title: note.title,
              folderId: note.folderId,
              updatedAt: note.updatedAt,
              pinned: note.pinned,
              sortOrder: note.sortOrder,
            })
          }
        },
        removeNote: (id) => {
          storage.removeNote(id)
        },
        removeAsset: (id) => assetStorage.removeAssetAsync(id),
        getExistingTitlesByFolder: () => {
          if (options.replaceExisting) return new Map<string, Set<string>>()
          const map = new Map<string, Set<string>>()
          for (const note of noteList.value) {
            getOrCreateTitleSet(map, note.folderId).add(note.title)
          }
          return map
        },
        saveImageFromBase64: (base64, mime, filename) =>
          saveImportImageAsAsset(base64, mime, filename, assetStorage.saveFromBlob),
        onProgress,
        getExistingNotes: () => noteList.value,
      })

      if (result.firstImportedNoteId) {
        notifyLibraryReset(result.firstImportedNoteId)
        const imported = storage.getNote(result.firstImportedNoteId)
        if (imported?.folderId) {
          activeFolderId.value = imported.folderId
        }
      }

      return result
    } catch (err) {
      // 失败路径：onNotesCommitted 已写入的条目需从 storage 重载清除
      noteList.value = storage.getNoteList()
      folderList.value = storage.getFolderList()
      throw err
    }
    // 成功路径：onNotesCommitted 已增量维护 noteList，无需全量重载（避免千份文件 UI 冻结）
    folderList.value = storage.getFolderList()
  }

  function getNoteContentById(id: string): string {
    if (currentNote.value?.id === id) return liveContent.value
    const cached = getTabContentCache(id)
    if (cached !== undefined) return cached
    return storage.getNote(id)?.content ?? ''
  }

  return {
    noteList, currentNote, liveContent, folderList, searchQuery, activeFolderId,
    searchedNoteList, filteredNoteList, sidebarStateRevision, trashVersion,
    tocVisible, tocJumpTarget, editorContentPush, pendingLargeFileSwitch,
    contentSearchIndex,
    loadNoteList, openNote, createNote, createNoteWithContent, setLiveContent, setActiveNote, setTocVisible,
    importMarkdownFile,
    applyExternalContentUpdate, updateCurrentContent, updateNoteContent, deleteNote, renameNote, moveNote, requestTocJump, insertAutoToc,
    clearPendingLargeFileSwitch, applyLargeFilePolicy,
    createFolder, deleteFolder, renameFolder, moveFolder, getDeleteFolderImpact,
    toggleNotePinned, reorderNotes, getNoteContentById,
    exportLibraryBackup, downloadLibraryBackup, restoreLibraryBackup, notifySidebarStateChanged,
    batchImportFromFolder, clearAllLibraryData,
    bindNoteToWorkingFile,
    
    // 回收站相关
    softDeleteNote, restoreNote, permanentDeleteNote, clearTrash, getTrashNotes,
    purgeOldTrash, canAddToTrash,
    // 文件夹回收站相关
    softDeleteFolder, restoreFolder, permanentDeleteFolder, clearTrashFolders,
    getTrashFolders, purgeOldTrashFolders,
    // 文件夹操作
    toggleFolderPinned, reorderFolders, cloneNote, batchMoveNotes, locateNoteFolder
  }
})

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStorage } from '../composables/useStorage'
import { useAppSettings } from '../composables/useAppSettings'
import { getAssetStorage } from '../composables/useAssetStorage'
import { collectAllNoteContents } from '../utils/resolveMarkdownAssets'
import { LARGE_FILE_THRESHOLD } from '../constants'
import { applyTocToContent } from '../utils/generateTocMarkdown'
import { migrateLegacyPathFolders, collectDescendantFolderIds, nextSiblingOrder, wouldCreateFolderCycle, getFolderDeleteImpact } from '../utils/folderTree'
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
import type { Note, NoteListItem, Folder, TocJumpTarget, EditorContentPush, ImportedMarkdownFile } from '../types'
import { extractNoteTitle } from '../utils/noteTitle'
import { getTabContentCache, setTabContentCache } from './tabContentCache'
import { notifyNoteDeleted, notifyLibraryReset } from './editorTabsBridge'
import { touchRecentNote, clearRecentNote } from '../utils/recentNotes'

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
  /** 递增时 Sidebar 从 settings 重载展开/选中状态 */
  const sidebarStateRevision = ref(0)
  /** 笔记正文搜索索引（id → 小写正文），loadNoteList 时重建 */
  const contentSearchIndex = ref<Record<string, string>>({})
  const tocVisible = ref(false)
  const tocJumpTarget = ref<TocJumpTarget | null>(null)
  const editorContentPush = ref<EditorContentPush | null>(null)
  const pendingLargeFileSwitch = ref(false)
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

  /** 删除笔记：移除存储，若为当前笔记则导航到列表首项或清空 */
  function deleteNote(id: string) {
    storage.removeNote(id)
    noteList.value = storage.getNoteList()
    const nextIndex = { ...contentSearchIndex.value }
    delete nextIndex[id]
    contentSearchIndex.value = nextIndex
    const contents = collectAllNoteContents(
      () => storage.getNoteList(),
      (noteId) => storage.getNote(noteId)
    )
    void getAssetStorage().gcOrphans(contents)
    clearRecentNote(id)
    notifyNoteDeleted(id)
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

  /** 创建文件夹并持久化 */
  function createFolder(name: string, parentId?: string) {
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

  /** 删除文件夹：子文件夹一并删除，笔记移入父文件夹（无父级则根目录） */
  function deleteFolder(id: string) {
    const target = folderList.value.find((f) => f.id === id)
    const moveTo = target?.parentId
    const idsToDelete = collectDescendantFolderIds(id, folderList.value)

    for (const item of noteList.value) {
      if (!item.folderId || !idsToDelete.has(item.folderId)) continue
      const note = storage.getNote(item.id)
      if (!note) continue
      note.folderId = moveTo
      note.updatedAt = Date.now()
      storage.saveNote(note)
      item.folderId = moveTo
      item.updatedAt = note.updatedAt
    }
    if (currentNote.value?.folderId && idsToDelete.has(currentNote.value.folderId)) {
      currentNote.value.folderId = moveTo
    }
    folderList.value = folderList.value.filter((f) => !idsToDelete.has(f.id))
    storage.saveFolderList(folderList.value)
    if (activeFolderId.value && idsToDelete.has(activeFolderId.value)) {
      activeFolderId.value = null
    }
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

  /** 清空全部笔记、文件夹与图片资源（保留应用设置） */
  async function clearAllLibraryData() {
    const assetStorage = getAssetStorage()
    storage.clearAllNotesAndFolders()
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
    searchedNoteList, filteredNoteList, sidebarStateRevision,
    tocVisible, tocJumpTarget, editorContentPush, pendingLargeFileSwitch,
    contentSearchIndex,
    loadNoteList, openNote, createNote, createNoteWithContent, setLiveContent, setActiveNote, setTocVisible,
    importMarkdownFile,
    applyExternalContentUpdate, updateCurrentContent, updateNoteContent, deleteNote, renameNote, moveNote, requestTocJump, insertAutoToc,
    clearPendingLargeFileSwitch, applyLargeFilePolicy,
    createFolder, deleteFolder, renameFolder, moveFolder, getDeleteFolderImpact,
    toggleNotePinned, reorderNotes, getNoteContentById,
    exportLibraryBackup, downloadLibraryBackup, restoreLibraryBackup, notifySidebarStateChanged,
    batchImportFromFolder, clearAllLibraryData
    , bindNoteToWorkingFile
  }
})

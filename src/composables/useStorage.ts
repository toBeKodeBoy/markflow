import type { Note, NoteListItem, Folder, AppSettings, TrashNote, TrashFolderEntry } from '../types'
import { showAppNotification } from '../utils/notify'

type LegacyNote = Note & { tags?: unknown }
type LegacyNoteListItem = NoteListItem & { tags?: unknown }

/** 检测当前环境是否为 uTools 插件 */
const isuTools = () => typeof window !== 'undefined' && typeof window.markflow !== 'undefined'

/** 统一处理存储异常：区分配额不足与其他错误，弹出通知 */
function handleStorageError(action: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err)
  const isQuota = msg.includes('quota') || msg.includes('QuotaExceeded')
  showAppNotification(
    isQuota
      ? '存储空间不足，笔记保存失败。请导出后删除部分笔记。'
      : `笔记${action}失败：${msg}`
  )
}

const localFallback = {
  getNoteList: (): NoteListItem[] => {
    try { return JSON.parse(localStorage.getItem('markflow_note_list') || '[]') } catch { return [] }
  },
  saveNoteList: (list: NoteListItem[]) => {
    try {
      localStorage.setItem('markflow_note_list', JSON.stringify(list))
    } catch (err) {
      handleStorageError('列表保存', err)
      throw err
    }
  },
  getNote: (id: string): Note | null => {
    try { return JSON.parse(localStorage.getItem('markflow_note_' + id) || 'null') } catch { return null }
  },
  saveNote: (id: string, data: Note) => {
    try {
      localStorage.setItem('markflow_note_' + id, JSON.stringify(data))
    } catch (err) {
      handleStorageError('保存', err)
      throw err
    }
  },
  removeNote: (id: string) => {
    localStorage.removeItem('markflow_note_' + id)
  },
  getFolderList: (): Folder[] => {
    try { return JSON.parse(localStorage.getItem('markflow_folder_list') || '[]') } catch { return [] }
  },
  saveFolderList: (list: Folder[]) => {
    try {
      localStorage.setItem('markflow_folder_list', JSON.stringify(list))
    } catch (err) {
      handleStorageError('文件夹保存', err)
      throw err
    }
  },
  getSettings: (): AppSettings => {
    try {
      return JSON.parse(localStorage.getItem('markflow_settings') || 'null') || defaultSettings()
    } catch { return defaultSettings() }
  },
  saveSettings: (settings: AppSettings) => {
    try {
      localStorage.setItem('markflow_settings', JSON.stringify(settings))
    } catch (err) {
      handleStorageError('设置保存', err)
      throw err
    }
  },
  // ===== 回收站相关方法 =====
  getTrashNotes: (): TrashNote[] => {
    try { return JSON.parse(localStorage.getItem('markflow_trash_notes') || '[]') } catch { return [] }
  },
  saveTrashNotes: (notes: TrashNote[]) => {
    try {
      localStorage.setItem('markflow_trash_notes', JSON.stringify(notes))
    } catch (err) {
      handleStorageError('回收站保存', err)
      throw err
    }
  },
  // ===== 文件夹回收站相关方法 =====
  getTrashFolders(): TrashFolderEntry[] {
    try { return JSON.parse(localStorage.getItem('markflow_trash_folders') || '[]') } catch { return [] }
  },
  saveTrashFolders(entries: TrashFolderEntry[]) {
    try {
      localStorage.setItem('markflow_trash_folders', JSON.stringify(entries))
    } catch (err) {
      handleStorageError('文件夹回收站保存', err)
      throw err
    }
  }
}

/** 返回默认应用设置 */
function defaultSettings(): AppSettings {
  return {
    theme: 'system',
    fontSize: 14,
    editorFontFamily: 'monospace',
    previewVisible: true,
    sidebarVisible: false,
    sidebarWidth: 260,
    pdfExport: {
      pageSize: 'A4',
      margin: 'default',
      printBackground: true,
      landscape: 'portrait',
      scale: 1,
      displayHeaderFooter: false,
      preferCssPageSize: true,
    },
    imageExport: {
      mode: 'note-assets-folder',
      customTemplate: './${filename}.assets',
      fileNameTemplate: '${filename}-${index}',
      overwriteStrategy: 'rename',
      bindNoteOnExport: true,
      downloadRemoteImages: true,
      syncUnusedAssets: true,
      unusedAssetsFolderName: '_unused',
    },
  }
}

/** 包装 uTools 存储写入方法，统一异常处理 */
function wrapBridgeSave<T extends (...args: never[]) => void>(fn: T, label: string): T {
  return ((...args: Parameters<T>) => {
    try {
      fn(...args)
    } catch (err) {
      handleStorageError(label, err)
      throw err
    }
  }) as T
}

function sanitizeNote(note: LegacyNote): Note {
  const { tags: _tags, ...rest } = note
  return rest
}

function sanitizeNoteListItem(item: LegacyNoteListItem): NoteListItem {
  const { tags: _tags, ...rest } = item
  return rest
}

export function useStorage() {
  const raw = isuTools() ? window.markflow : localFallback
  const bridge = isuTools()
    ? {
        ...raw,
        saveNoteList: wrapBridgeSave(raw.saveNoteList.bind(raw), '列表保存'),
        saveNote: wrapBridgeSave(raw.saveNote.bind(raw), '保存'),
        saveFolderList: wrapBridgeSave(raw.saveFolderList.bind(raw), '文件夹保存'),
        saveSettings: wrapBridgeSave(raw.saveSettings.bind(raw), '设置保存'),
        saveTrashNotes: wrapBridgeSave(raw.saveTrashNotes.bind(raw), '回收站保存'),
        // 修复（Code Review #11）：文件夹回收站写入同样需要统一异常包装
        saveTrashFolders: wrapBridgeSave(raw.saveTrashFolders.bind(raw), '文件夹回收站保存'),
      }
    : localFallback

  /** 获取全部笔记列表项 */
  function getNoteList(): NoteListItem[] {
    return bridge.getNoteList().map((item) => sanitizeNoteListItem(item))
  }

  /** 保存笔记列表项（写入前剥离 legacy tags） */
  function saveNoteList(list: NoteListItem[]) {
    bridge.saveNoteList(list.map((item) => sanitizeNoteListItem(item as LegacyNoteListItem)))
  }

  /** 根据 ID 获取完整笔记 */
  function getNote(id: string): Note | null {
    const note = bridge.getNote(id)
    return note ? sanitizeNote(note) : null
  }

  /** 保存笔记及同步更新笔记列表 */
  function saveNote(note: Note) {
    const sanitized = sanitizeNote(note)
    bridge.saveNote(sanitized.id, sanitized)
    const list = getNoteList()
    const idx = list.findIndex(n => n.id === sanitized.id)
    const item: NoteListItem = {
      id: sanitized.id,
      title: sanitized.title,
      folderId: sanitized.folderId,
      updatedAt: sanitized.updatedAt,
      pinned: sanitized.pinned || undefined,
      sortOrder: sanitized.sortOrder,
    }
    if (idx >= 0) list[idx] = item
    else list.unshift(item)
    saveNoteList(list)
  }

  /** 批量保存笔记：逐条写本体，noteList 只读写一次 */
  function saveNoteBatch(notes: Note[]) {
    if (notes.length === 0) return
    const list = getNoteList()
    for (const note of notes) {
      const sanitized = sanitizeNote(note)
      bridge.saveNote(sanitized.id, sanitized)
      const item: NoteListItem = {
        id: sanitized.id,
        title: sanitized.title,
        folderId: sanitized.folderId,
        updatedAt: sanitized.updatedAt,
        pinned: sanitized.pinned || undefined,
        sortOrder: sanitized.sortOrder,
      }
      const idx = list.findIndex((n) => n.id === sanitized.id)
      if (idx >= 0) list[idx] = item
      else list.unshift(item)
    }
    saveNoteList(list)
  }

  /** 删除笔记并从列表移除 */
  function removeNote(id: string) {
    const list = getNoteList().filter(n => n.id !== id)
    saveNoteList(list)
    bridge.removeNote(id)
  }

  /** 清空全部笔记与文件夹（保留应用设置） */
  function clearAllNotesAndFolders() {
    for (const item of getNoteList()) {
      bridge.removeNote(item.id)
    }
    saveNoteList([])
    saveFolderList([])
  }

  /** 获取文件夹列表 */
  function getFolderList(): Folder[] {
    return bridge.getFolderList()
  }

  /** 保存文件夹列表 */
  function saveFolderList(list: Folder[]) {
    bridge.saveFolderList(list)
  }

  /** 获取应用设置 */
  function getSettings(): AppSettings {
    return bridge.getSettings()
  }

  /** 保存应用设置 */
  function saveSettings(settings: AppSettings) {
    bridge.saveSettings(settings)
  }

  // ===== 回收站相关方法 =====

  /** 获取所有回收站笔记 */
  function getTrashNotes(): TrashNote[] {
    return bridge.getTrashNotes()
  }

  /** 保存回收站笔记到存储 */
  function saveTrashNote(note: TrashNote) {
    const trashList = getTrashNotes()
    // 避免重复添加
    const idx = trashList.findIndex(n => n.id === note.id)
    if (idx >= 0) {
      trashList[idx] = note
    } else {
      trashList.push(note)
    }
    bridge.saveTrashNotes(trashList)
  }

  /** 从回收站移除指定笔记 */
  function removeTrashNote(id: string) {
    const trashList = getTrashNotes().filter(n => n.id !== id)
    bridge.saveTrashNotes(trashList)
  }

  /** 恢复回收站笔记到主列表 */
  function restoreTrashNote(id: string): Note | null {
    const trashNote = getTrashNotes().find(n => n.id === id)
    if (!trashNote) return null
    
    // 重建 Note 对象（彻底清除回收站元数据）
    const { deletedBy: _deletedBy, restoredAt: _restoredAt, deletedAt: _deletedAt, ...rest } = trashNote
    const restored: Note = { ...rest }
    
    // 修复（Code Review #3）：folderId 指向的文件夹可能已被删除，悬空则回落到根目录，避免笔记"隐形"
    if (restored.folderId) {
      const folders = getFolderList()
      if (!folders.some(f => f.id === restored.folderId)) {
        restored.folderId = undefined
      }
    }
    
    // 写入主列表
    saveNote(restored)
    
    // 从回收站移除
    removeTrashNote(id)
    
    return restored
  }

  /** 永久删除笔记（从回收站彻底清除） */
  function permanentlyDeleteNote(id: string) {
    // 修复（Code Review #2）：仅从回收站移除，不再对主列表做 removeNote 兜底，
    // 避免用户已单独恢复的笔记在文件夹永久删除时被误删
    removeTrashNote(id)
  }

  /** 清空整个回收站 */
  function clearTrash() {
    bridge.saveTrashNotes([])
  }

  // ===== 文件夹回收站相关方法 =====

  /** 获取所有文件夹回收站条目 */
  function getTrashFolders(): TrashFolderEntry[] {
    return bridge.getTrashFolders?.() ?? []
  }

  /** 保存文件夹回收站条目列表 */
  function saveTrashFolders(entries: TrashFolderEntry[]) {
    // 修复（Code Review #11）：MarkFlowBridge 接口已声明该方法为必选，去掉可选链
    bridge.saveTrashFolders(entries)
  }

  /** 保存单个文件夹回收站条目（同 ID 覆盖） */
  function saveTrashFolderEntry(entry: TrashFolderEntry) {
    const list = getTrashFolders()
    const idx = list.findIndex(e => e.folder.id === entry.folder.id)
    if (idx >= 0) {
      list[idx] = entry
    } else {
      list.push(entry)
    }
    saveTrashFolders(list)
  }

  /** 从文件夹回收站移除指定 ID 的条目 */
  function removeTrashFolder(id: string) {
    const list = getTrashFolders().filter(e => e.folder.id !== id)
    saveTrashFolders(list)
  }

  /** 恢复文件夹回收站条目，返回被恢复的 entry 并从列表移除 */
  function restoreTrashFolder(id: string): TrashFolderEntry | null {
    const entry = getTrashFolders().find(e => e.folder.id === id)
    if (!entry) return null
    removeTrashFolder(id)
    return entry
  }

  /** 永久删除文件夹回收站条目 */
  function permanentlyDeleteFolder(id: string) {
    removeTrashFolder(id)
  }

  /** 清空文件夹回收站 */
  function clearTrashFolders() {
    saveTrashFolders([])
  }

  return {
    getNoteList,
    saveNoteList,
    getNote,
    saveNote,
    saveNoteBatch,
    removeNote,
    clearAllNotesAndFolders,
    getFolderList,
    saveFolderList,
    getSettings,
    saveSettings,
    
    // 回收站相关
    getTrashNotes,
    saveTrashNote,
    removeTrashNote,
    restoreTrashNote,
    permanentlyDeleteNote,
    clearTrash,

    // 文件夹回收站相关
    getTrashFolders,
    saveTrashFolders,
    saveTrashFolderEntry,
    removeTrashFolder,
    restoreTrashFolder,
    permanentlyDeleteFolder,
    clearTrashFolders,
  }
}

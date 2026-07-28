import type { Note, NoteListItem, Folder, AppSettings } from '../types'
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
  }
}

/** 返回默认应用设置 */
function defaultSettings(): AppSettings {
  return {
    theme: 'system',
    fontSize: 14,
    editorFontFamily: 'monospace',
    previewVisible: true,
    sidebarVisible: true,
    sidebarWidth: 240,
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

  return { getNoteList, saveNoteList, getNote, saveNote, removeNote, clearAllNotesAndFolders, getFolderList, saveFolderList, getSettings, saveSettings }
}

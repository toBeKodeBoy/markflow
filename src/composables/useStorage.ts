import type { Note, NoteListItem, Folder, AppSettings } from '../types'
import { showAppNotification } from '../utils/notify'

// Fallback storage using localStorage (for dev without uTools)
const isuTools = () => typeof window !== 'undefined' && typeof window.markflow !== 'undefined'

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

function defaultSettings(): AppSettings {
  return { theme: 'system', fontSize: 14, editorFontFamily: 'monospace', previewVisible: true, sidebarVisible: true }
}

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

  function getNoteList(): NoteListItem[] {
    return bridge.getNoteList()
  }

  function saveNoteList(list: NoteListItem[]) {
    bridge.saveNoteList(list)
  }

  function getNote(id: string): Note | null {
    return bridge.getNote(id)
  }

  function saveNote(note: Note) {
    const list = getNoteList()
    const idx = list.findIndex(n => n.id === note.id)
    const item: NoteListItem = { id: note.id, title: note.title, folderId: note.folderId, updatedAt: note.updatedAt }
    if (idx >= 0) list[idx] = item
    else list.unshift(item)
    saveNoteList(list)
    bridge.saveNote(note.id, note)
  }

  function removeNote(id: string) {
    const list = getNoteList().filter(n => n.id !== id)
    saveNoteList(list)
    bridge.removeNote(id)
  }

  function getFolderList(): Folder[] {
    return bridge.getFolderList()
  }

  function saveFolderList(list: Folder[]) {
    bridge.saveFolderList(list)
  }

  function getSettings(): AppSettings {
    return bridge.getSettings()
  }

  function saveSettings(settings: AppSettings) {
    bridge.saveSettings(settings)
  }

  return { getNoteList, saveNoteList, getNote, saveNote, removeNote, getFolderList, saveFolderList, getSettings, saveSettings }
}

import type { AppSettings, Folder, Note, NoteListItem } from '../types'

export const BACKUP_VERSION = 1 as const

export interface MarkFlowBackup {
  version: typeof BACKUP_VERSION
  exportedAt: number
  notes: Note[]
  folders: Folder[]
  settings: AppSettings
}

export interface BackupStorageReader {
  getNoteList: () => NoteListItem[]
  getNote: (id: string) => Note | null
  getFolderList: () => Folder[]
  getSettings: () => AppSettings
}

export interface BackupStorageWriter {
  saveNote: (note: Note) => void
  saveFolderList: (list: Folder[]) => void
  saveSettings: (settings: AppSettings) => void
  clearAllNotesAndFolders: () => void
}

/** 收集可导出的全量备份数据 */
export function buildBackup(storage: BackupStorageReader): MarkFlowBackup {
  const notes: Note[] = []
  for (const item of storage.getNoteList()) {
    const note = storage.getNote(item.id)
    if (note) notes.push(note)
  }
  return {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    notes,
    folders: storage.getFolderList(),
    settings: storage.getSettings(),
  }
}

/** 解析备份 JSON */
export function parseBackup(json: string): MarkFlowBackup {
  const data = JSON.parse(json) as MarkFlowBackup
  if (data.version !== BACKUP_VERSION) {
    throw new Error(`不支持的备份版本：${data.version}`)
  }
  if (!Array.isArray(data.notes) || !Array.isArray(data.folders)) {
    throw new Error('备份格式无效')
  }
  return data
}

/** 清空并写入备份（侧栏展开状态等合并进当前 settings） */
export function applyBackup(
  backup: MarkFlowBackup,
  storage: BackupStorageWriter & BackupStorageReader
): AppSettings {
  storage.clearAllNotesAndFolders()
  storage.saveFolderList(backup.folders)
  for (const note of backup.notes) {
    storage.saveNote(note)
  }
  const current = storage.getSettings()
  const next: AppSettings = {
    ...current,
    sidebarExpandedFolderIds: backup.settings.sidebarExpandedFolderIds,
    sidebarActiveFolderId: backup.settings.sidebarActiveFolderId,
  }
  storage.saveSettings(next)
  return next
}

export function downloadBackupJson(backup: MarkFlowBackup, filename?: string): void {
  const name =
    filename ?? `markflow-backup-${new Date(backup.exportedAt).toISOString().slice(0, 10)}.json`
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

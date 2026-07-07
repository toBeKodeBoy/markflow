import type { AppSettings, Folder, Note, NoteListItem } from '../types'
import type { AssetIndexItem, AssetRecord } from '../types/asset'

export const BACKUP_VERSION_LEGACY = 1 as const
export const BACKUP_VERSION = 2 as const

export interface MarkFlowBackupAssets {
  index: AssetIndexItem[]
  records: Record<string, AssetRecord>
}

export interface MarkFlowBackup {
  version: typeof BACKUP_VERSION
  exportedAt: number
  notes: Note[]
  folders: Folder[]
  settings: AppSettings
  assets: MarkFlowBackupAssets
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

export interface BackupAssetReader {
  getIndex: () => AssetIndexItem[]
  getAsset: (id: string) => AssetRecord | null
}

export interface BackupAssetAsyncReader {
  getIndex: () => AssetIndexItem[]
  getAssetAsync: (id: string) => Promise<AssetRecord | null>
}

export interface BackupAssetWriter {
  saveAssetIndex: (index: AssetIndexItem[]) => void
  saveAsset: (id: string, record: AssetRecord) => void
}

const EMPTY_ASSETS: MarkFlowBackupAssets = { index: [], records: {} }

/** 收集可导出的全量备份数据 */
export function buildBackup(
  storage: BackupStorageReader,
  assets?: BackupAssetReader
): MarkFlowBackup {
  const notes: Note[] = []
  for (const item of storage.getNoteList()) {
    const note = storage.getNote(item.id)
    if (note) notes.push(note)
  }

  const assetBackup: MarkFlowBackupAssets = { index: [], records: {} }
  if (assets) {
    assetBackup.index = assets.getIndex()
    for (const item of assetBackup.index) {
      const record = assets.getAsset(item.id)
      if (record) assetBackup.records[item.id] = record
    }
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    notes,
    folders: storage.getFolderList(),
    settings: storage.getSettings(),
    assets: assetBackup,
  }
}

/** 收集可导出的全量备份（异步读取图片资源，兼容 IndexedDB） */
export async function buildBackupAsync(
  storage: BackupStorageReader,
  assets?: BackupAssetAsyncReader
): Promise<MarkFlowBackup> {
  const notes: Note[] = []
  for (const item of storage.getNoteList()) {
    const note = storage.getNote(item.id)
    if (note) notes.push(note)
  }

  const assetBackup: MarkFlowBackupAssets = { index: [], records: {} }
  if (assets) {
    assetBackup.index = assets.getIndex()
    for (const item of assetBackup.index) {
      const record = await assets.getAssetAsync(item.id)
      if (record) assetBackup.records[item.id] = record
    }
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    notes,
    folders: storage.getFolderList(),
    settings: storage.getSettings(),
    assets: assetBackup,
  }
}

/** 解析备份 JSON（兼容 v1 无 assets 字段） */
export function parseBackup(json: string): MarkFlowBackup {
  const data = JSON.parse(json) as MarkFlowBackup & { version: number }
  if (data.version !== BACKUP_VERSION && data.version !== BACKUP_VERSION_LEGACY) {
    throw new Error(`不支持的备份版本：${data.version}`)
  }
  if (!Array.isArray(data.notes) || !Array.isArray(data.folders)) {
    throw new Error('备份格式无效')
  }
  return {
    version: BACKUP_VERSION,
    exportedAt: data.exportedAt,
    notes: data.notes,
    folders: data.folders,
    settings: data.settings,
    assets: data.assets ?? EMPTY_ASSETS,
  }
}

/** 清空并写入备份（侧栏展开状态等合并进当前 settings） */
export function applyBackup(
  backup: MarkFlowBackup,
  storage: BackupStorageWriter & BackupStorageReader,
  assets?: BackupAssetWriter
): AppSettings {
  storage.clearAllNotesAndFolders()
  storage.saveFolderList(backup.folders)
  for (const note of backup.notes) {
    storage.saveNote(note)
  }
  if (assets && backup.assets.index.length > 0) {
    assets.saveAssetIndex(backup.assets.index)
    for (const [id, record] of Object.entries(backup.assets.records)) {
      assets.saveAsset(id, record)
    }
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

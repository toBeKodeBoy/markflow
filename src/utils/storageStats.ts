import type { AppSettings, Folder, Note, NoteListItem } from '../types'
import type { AssetIndexItem, AssetRecord } from '../types/asset'

export interface StorageStats {
  noteCount: number
  folderCount: number
  assetCount: number
  estimatedBytes: number
  estimatedLabel: string
}

export interface StorageStatsReader {
  getNoteList: () => NoteListItem[]
  getNote: (id: string) => Note | null
  getFolderList: () => Folder[]
  getSettings: () => AppSettings
}

export interface AssetStatsReader {
  getIndex: () => AssetIndexItem[]
  getAsset: (id: string) => AssetRecord | null | Promise<AssetRecord | null>
}

export function formatStorageBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function estimateStorageUsage(
  storage: StorageStatsReader,
  assets: AssetStatsReader
): Promise<StorageStats> {
  let estimatedBytes = 0

  estimatedBytes += JSON.stringify(storage.getNoteList()).length
  estimatedBytes += JSON.stringify(storage.getFolderList()).length
  estimatedBytes += JSON.stringify(storage.getSettings()).length

  for (const item of storage.getNoteList()) {
    const note = storage.getNote(item.id)
    if (note) estimatedBytes += JSON.stringify(note).length
  }

  const index = assets.getIndex()
  estimatedBytes += JSON.stringify(index).length
  for (const item of index) {
    const record = await assets.getAsset(item.id)
    if (record) estimatedBytes += JSON.stringify(record).length
  }

  return {
    noteCount: storage.getNoteList().length,
    folderCount: storage.getFolderList().length,
    assetCount: index.length,
    estimatedBytes,
    estimatedLabel: formatStorageBytes(estimatedBytes),
  }
}

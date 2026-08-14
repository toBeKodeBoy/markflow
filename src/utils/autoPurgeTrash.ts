import { useNoteStore } from '../stores/note'

/**
 * 自动清理过期的回收站笔记与文件夹条目
 * @param maxDays 保留天数，默认30天
 * @returns 是否执行了清理
 */
const DEFAULT_RETENTION_DAYS = 30
const MAX_RETENTION_DAYS = 3650
const DAY_MS = 24 * 60 * 60 * 1000

function normalizeRetentionDays(value: number): number {
  return Number.isInteger(value) && value >= 1 && value <= MAX_RETENTION_DAYS
    ? value
    : DEFAULT_RETENTION_DAYS
}

export async function autoPurgeTrash(maxDays: number = DEFAULT_RETENTION_DAYS): Promise<boolean> {
  const store = useNoteStore()
  const cutoffDate = Date.now() - normalizeRetentionDays(maxDays) * DAY_MS

  let cleaned = false

  // 只处理有明确时间戳的条目，旧数据不能默认视为 1970 年过期。
  const oldNotes = store.getTrashNotes().filter(
    note => typeof note.deletedAt === 'number' && note.deletedAt < cutoffDate,
  )
  for (const note of oldNotes) {
    const current = store.getTrashNotes().find(candidate => candidate.id === note.id)
    if (current?.deletedAt !== note.deletedAt) continue
    await store.permanentDeleteNote(note.id)
    cleaned = true
  }
  if (cleaned) console.log(`[回收站] 已自动清理过期笔记`)

  let cleanedFolders = 0
  const oldFolders = store.getTrashFolders().filter(
    entry => typeof entry.deletedAt === 'number' && entry.deletedAt < cutoffDate,
  )
  for (const entry of oldFolders) {
    const current = store.getTrashFolders().find(
      candidate => candidate.folder.id === entry.folder.id,
    )
    if (current?.deletedAt !== entry.deletedAt) continue
    store.permanentDeleteFolder(entry.folder.id)
    cleanedFolders++
  }
  if (cleanedFolders > 0) {
    console.log(`[回收站] 已自动清理 ${cleanedFolders} 个过期文件夹`)
    cleaned = true
  }

  return cleaned
}

import type { NoteListItem, RecentNoteAccess } from '../types'
import { RECENT_NOTE_LIMIT } from '../constants/recentFolder'
import { useStorage } from '../composables/useStorage'
import { useAppSettings } from '../composables/useAppSettings'

/** 记录笔记访问，LRU 写入并截断 */
export function recordRecentAccess(
  access: RecentNoteAccess[],
  noteId: string,
  now: number = Date.now()
): RecentNoteAccess[] {
  const filtered = access.filter((e) => e.noteId !== noteId)
  return [{ noteId, openedAt: now }, ...filtered].slice(0, RECENT_NOTE_LIMIT)
}

/** 从访问记录中移除笔记 */
export function removeRecentAccess(
  access: RecentNoteAccess[],
  noteId: string
): RecentNoteAccess[] {
  return access.filter((e) => e.noteId !== noteId)
}

function recentScore(entry: RecentNoteAccess, note: NoteListItem): number {
  return Math.max(entry.openedAt, note.updatedAt)
}

function compareRecentNotes(
  a: NoteListItem,
  b: NoteListItem,
  accessMap: Map<string, RecentNoteAccess>
): number {
  const pinA = a.pinned ? 1 : 0
  const pinB = b.pinned ? 1 : 0
  if (pinA !== pinB) return pinB - pinA

  const entryA = accessMap.get(a.id)!
  const entryB = accessMap.get(b.id)!
  return recentScore(entryB, b) - recentScore(entryA, a)
}

/** 构建最近访问笔记列表：过滤已删除、置顶优先、按活跃度降序 */
export function buildRecentNoteList(
  access: RecentNoteAccess[],
  noteList: NoteListItem[],
  limit: number = RECENT_NOTE_LIMIT
): NoteListItem[] {
  const noteById = new Map(noteList.map((n) => [n.id, n]))
  const accessMap = new Map<string, RecentNoteAccess>()

  for (const entry of access) {
    if (noteById.has(entry.noteId)) {
      accessMap.set(entry.noteId, entry)
    }
  }

  const candidates = [...accessMap.keys()]
    .map((id) => noteById.get(id)!)
    .sort((a, b) => compareRecentNotes(a, b, accessMap))

  return candidates.slice(0, limit)
}

/** 记录笔记访问并持久化到 AppSettings */
export function touchRecentNote(noteId: string, now: number = Date.now()): void {
  const storage = useStorage()
  const appSettings = useAppSettings()
  const settings = storage.getSettings()
  const access = settings.recentNoteAccess ?? []
  appSettings.save({ recentNoteAccess: recordRecentAccess(access, noteId, now) })
}

/** 从访问记录中移除笔记并持久化 */
export function clearRecentNote(noteId: string): void {
  const storage = useStorage()
  const appSettings = useAppSettings()
  const settings = storage.getSettings()
  const access = settings.recentNoteAccess ?? []
  const next = removeRecentAccess(access, noteId)
  if (next.length !== access.length) {
    appSettings.save({ recentNoteAccess: next })
  }
}

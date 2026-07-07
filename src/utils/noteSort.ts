import type { NoteListItem } from '../types'

/** 置顶 > sortOrder > updatedAt（与 v1.1 排序规则一致） */
export function compareNotes(a: NoteListItem, b: NoteListItem): number {
  const pinA = a.pinned ? 1 : 0
  const pinB = b.pinned ? 1 : 0
  if (pinA !== pinB) return pinB - pinA

  if (pinA === 1) return b.updatedAt - a.updatedAt

  const hasOrderA = a.sortOrder != null
  const hasOrderB = b.sortOrder != null
  if (hasOrderA && hasOrderB && a.sortOrder !== b.sortOrder) {
    return a.sortOrder! - b.sortOrder!
  }
  if (hasOrderA !== hasOrderB) return hasOrderA ? -1 : 1

  return b.updatedAt - a.updatedAt
}

export function sortNotes(notes: NoteListItem[]): NoteListItem[] {
  return [...notes].sort(compareNotes)
}

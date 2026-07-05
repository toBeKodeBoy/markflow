import type { NoteListItem } from '../types'

/** 置顶 > sortOrder > updatedAt（与 v1.1 排序规则一致） */
export function compareNotes(a: NoteListItem, b: NoteListItem): number {
  const pinA = a.pinned ? 1 : 0
  const pinB = b.pinned ? 1 : 0
  if (pinA !== pinB) return pinB - pinA

  const orderA = a.sortOrder ?? 0
  const orderB = b.sortOrder ?? 0
  if (orderA !== orderB) return orderA - orderB

  return b.updatedAt - a.updatedAt
}

export function sortNotes(notes: NoteListItem[]): NoteListItem[] {
  return [...notes].sort(compareNotes)
}

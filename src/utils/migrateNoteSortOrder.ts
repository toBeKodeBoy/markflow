import type { NoteListItem } from '../types'
import { sortNotes } from './noteSort'

export interface SortOrderMigrationUpdate {
  id: string
  sortOrder: number
}

/** 同级笔记中是否仍有未设置 sortOrder 的项 */
export function siblingGroupNeedsSortOrderMigration(siblings: NoteListItem[]): boolean {
  return siblings.length > 0 && siblings.some((n) => n.sortOrder == null)
}

/**
 * 为缺 sortOrder 的同级笔记补全顺序（一次性懒迁移）。
 * 按当前 compareNotes 顺序写入 (index+1)*100，与 reorderNotes 一致。
 */
export function planSortOrderMigration(notes: NoteListItem[]): SortOrderMigrationUpdate[] {
  const byFolder = new Map<string | undefined, NoteListItem[]>()
  for (const note of notes) {
    const key = note.folderId
    const list = byFolder.get(key)
    if (list) list.push(note)
    else byFolder.set(key, [note])
  }

  const updates: SortOrderMigrationUpdate[] = []
  for (const siblings of byFolder.values()) {
    if (!siblingGroupNeedsSortOrderMigration(siblings)) continue
    const sorted = sortNotes(siblings)
    sorted.forEach((note, index) => {
      const sortOrder = (index + 1) * 100
      if (note.sortOrder !== sortOrder) {
        updates.push({ id: note.id, sortOrder })
      }
    })
  }
  return updates
}

import type { NoteListItem } from '../types'

export type ReorderPosition = 'before' | 'after'

/** 计算同级笔记拖拽后的 id 顺序 */
export function computeReorderedIds(
  siblings: NoteListItem[],
  draggedId: string,
  targetId: string,
  position: ReorderPosition
): string[] {
  const ids = siblings.map((n) => n.id)
  if (draggedId === targetId) return ids

  const without = ids.filter((id) => id !== draggedId)
  const targetIndex = without.indexOf(targetId)
  if (targetIndex < 0) return ids

  const insertAt = position === 'before' ? targetIndex : targetIndex + 1
  without.splice(insertAt, 0, draggedId)
  return without
}

export interface UseNoteSortOptions {
  getSiblings: (noteId: string) => NoteListItem[]
  onReorder: (folderId: string | undefined, orderedIds: string[]) => void
}

export function useNoteSort(options: UseNoteSortOptions) {
  function handleNoteDrop(
    draggedId: string,
    targetId: string,
    position: ReorderPosition,
    folderId: string | undefined
  ) {
    const siblings = options.getSiblings(draggedId)
    const orderedIds = computeReorderedIds(siblings, draggedId, targetId, position)
    options.onReorder(folderId, orderedIds)
  }

  return { handleNoteDrop, computeReorderedIds }
}

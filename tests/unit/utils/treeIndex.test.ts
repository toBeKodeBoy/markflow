import { describe, it, expect } from 'vitest'
import { buildTreeIndex, countNotesInSubtree } from '../../../src/utils/treeIndex'
import type { Folder, NoteListItem } from '../../../src/types'

describe('treeIndex', () => {
  const folders: Folder[] = [
    { id: 'a', name: 'docs', order: 0 },
    { id: 'b', name: 'api', order: 0, parentId: 'a' },
  ]
  const notes: NoteListItem[] = [
    { id: 'n1', title: 'One', updatedAt: 1, folderId: 'a' },
    { id: 'n2', title: 'Two', updatedAt: 2, folderId: 'b' },
  ]

  it('builds notesByFolder and counts subtree notes', () => {
    const index = buildTreeIndex(folders, notes)
    expect(index.notesByFolder.get('a')).toHaveLength(1)
    expect(countNotesInSubtree(index, 'a')).toBe(2)
  })
})

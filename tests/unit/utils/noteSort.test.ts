import { describe, it, expect } from 'vitest'
import { compareNotes, sortNotes } from '../../../src/utils/noteSort'
import type { NoteListItem } from '../../../src/types'

describe('noteSort', () => {
  it('sorts pinned notes first', () => {
    const a: NoteListItem = { id: '1', title: 'A', updatedAt: 10, pinned: true }
    const b: NoteListItem = { id: '2', title: 'B', updatedAt: 20 }
    expect(compareNotes(a, b)).toBeLessThan(0)
  })

  it('sorts by sortOrder then updatedAt', () => {
    const notes: NoteListItem[] = [
      { id: '1', title: 'Old', updatedAt: 1, sortOrder: 2 },
      { id: '2', title: 'New', updatedAt: 99, sortOrder: 1 },
      { id: '3', title: 'Mid', updatedAt: 50 },
    ]
    expect(sortNotes(notes).map((n) => n.id)).toEqual(['3', '2', '1'])
  })
})

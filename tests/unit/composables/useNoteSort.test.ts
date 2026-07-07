import { describe, it, expect } from 'vitest'
import { computeReorderedIds } from '../../../src/composables/useNoteSort'
import type { NoteListItem } from '../../../src/types'

function item(id: string, sortOrder?: number): NoteListItem {
  return { id, title: id, updatedAt: 0, sortOrder }
}

describe('useNoteSort', () => {
  describe('computeReorderedIds', () => {
    const siblings = [item('a', 100), item('b', 200), item('c', 300)]

    it('moves item before target', () => {
      expect(computeReorderedIds(siblings, 'c', 'a', 'before')).toEqual(['c', 'a', 'b'])
    })

    it('moves item after target', () => {
      expect(computeReorderedIds(siblings, 'a', 'b', 'after')).toEqual(['b', 'a', 'c'])
    })

    it('returns unchanged order when dragging onto self', () => {
      expect(computeReorderedIds(siblings, 'b', 'b', 'before')).toEqual(['a', 'b', 'c'])
    })
  })
})

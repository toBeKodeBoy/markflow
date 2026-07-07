import { describe, it, expect } from 'vitest'
import {
  planSortOrderMigration,
  siblingGroupNeedsSortOrderMigration,
} from '../../../src/utils/migrateNoteSortOrder'
import type { NoteListItem } from '../../../src/types'

function note(
  id: string,
  opts: Partial<NoteListItem> = {}
): NoteListItem {
  return { id, title: id, updatedAt: 0, ...opts }
}

describe('migrateNoteSortOrder', () => {
  describe('siblingGroupNeedsSortOrderMigration', () => {
    it('缺任一 sortOrder 时需要迁移', () => {
      expect(siblingGroupNeedsSortOrderMigration([note('a'), note('b', { sortOrder: 100 })])).toBe(true)
    })

    it('全部已有 sortOrder 时跳过', () => {
      expect(
        siblingGroupNeedsSortOrderMigration([
          note('a', { sortOrder: 100 }),
          note('b', { sortOrder: 200 }),
        ])
      ).toBe(false)
    })
  })

  describe('planSortOrderMigration', () => {
    it('同级全无 sortOrder 时按 updatedAt 倒序补全', () => {
      const updates = planSortOrderMigration([
        note('old', { folderId: 'f1', updatedAt: 10 }),
        note('new', { folderId: 'f1', updatedAt: 20 }),
      ])
      expect(updates).toEqual([
        { id: 'new', sortOrder: 100 },
        { id: 'old', sortOrder: 200 },
      ])
    })

    it('不同 folderId 独立迁移', () => {
      const updates = planSortOrderMigration([
        note('a', { folderId: 'f1', updatedAt: 1 }),
        note('b', { updatedAt: 2 }),
      ])
      expect(updates).toHaveLength(2)
      expect(updates.find((u) => u.id === 'b')?.sortOrder).toBe(100)
      expect(updates.find((u) => u.id === 'a')?.sortOrder).toBe(100)
    })

    it('置顶笔记排在非置顶之前', () => {
      const updates = planSortOrderMigration([
        note('normal', { folderId: 'f1', updatedAt: 99 }),
        note('pin', { folderId: 'f1', updatedAt: 1, pinned: true }),
      ])
      expect(updates.map((u) => u.id)).toEqual(['pin', 'normal'])
      expect(updates[0].sortOrder).toBe(100)
      expect(updates[1].sortOrder).toBe(200)
    })

    it('同级已全部有 sortOrder 时不产生更新', () => {
      expect(
        planSortOrderMigration([
          note('a', { folderId: 'f1', sortOrder: 100, updatedAt: 1 }),
          note('b', { folderId: 'f1', sortOrder: 200, updatedAt: 2 }),
        ])
      ).toEqual([])
    })

    it('部分缺 sortOrder 时整组按当前展示顺序重写', () => {
      const updates = planSortOrderMigration([
        note('a', { folderId: 'f1', sortOrder: 500, updatedAt: 1 }),
        note('b', { folderId: 'f1', updatedAt: 99 }),
      ])
      expect(updates).toEqual([
        { id: 'a', sortOrder: 100 },
        { id: 'b', sortOrder: 200 },
      ])
    })
  })
})

import { describe, it, expect } from 'vitest'
import {
  recordRecentAccess,
  removeRecentAccess,
  buildRecentNoteList,
} from '../../../src/utils/recentNotes'
import { RECENT_NOTE_LIMIT } from '../../../src/constants/recentFolder'
import type { NoteListItem, RecentNoteAccess } from '../../../src/types'

const notes: NoteListItem[] = [
  { id: 'n1', title: 'A', updatedAt: 100 },
  { id: 'n2', title: 'B', updatedAt: 200, pinned: true },
  { id: 'n3', title: 'C', updatedAt: 300 },
  { id: 'n4', title: 'D', updatedAt: 400 },
]

describe('recentNotes', () => {
  describe('recordRecentAccess', () => {
    it('新记录插到头部', () => {
      const result = recordRecentAccess([], 'n1', 1000)
      expect(result).toEqual([{ noteId: 'n1', openedAt: 1000 }])
    })

    it('重复访问移到头部并更新 openedAt', () => {
      const access: RecentNoteAccess[] = [
        { noteId: 'n1', openedAt: 100 },
        { noteId: 'n2', openedAt: 200 },
      ]
      const result = recordRecentAccess(access, 'n2', 500)
      expect(result).toEqual([
        { noteId: 'n2', openedAt: 500 },
        { noteId: 'n1', openedAt: 100 },
      ])
    })

    it('超过上限时截断', () => {
      let access: RecentNoteAccess[] = []
      for (let i = 0; i < RECENT_NOTE_LIMIT + 5; i++) {
        access = recordRecentAccess(access, `n${i}`, i)
      }
      expect(access).toHaveLength(RECENT_NOTE_LIMIT)
      expect(access[0].noteId).toBe(`n${RECENT_NOTE_LIMIT + 4}`)
    })
  })

  describe('removeRecentAccess', () => {
    it('删除指定笔记记录', () => {
      const access: RecentNoteAccess[] = [
        { noteId: 'n1', openedAt: 100 },
        { noteId: 'n2', openedAt: 200 },
      ]
      expect(removeRecentAccess(access, 'n1')).toEqual([
        { noteId: 'n2', openedAt: 200 },
      ])
    })
  })

  describe('buildRecentNoteList', () => {
    it('过滤已删除笔记', () => {
      const access: RecentNoteAccess[] = [
        { noteId: 'n1', openedAt: 100 },
        { noteId: 'deleted', openedAt: 200 },
      ]
      const result = buildRecentNoteList(access, notes)
      expect(result.map((n) => n.id)).toEqual(['n1'])
    })

    it('按 score = max(openedAt, updatedAt) 降序排序', () => {
      const access: RecentNoteAccess[] = [
        { noteId: 'n1', openedAt: 50 },
        { noteId: 'n3', openedAt: 250 },
      ]
      const result = buildRecentNoteList(access, notes)
      // n3: score=max(250,300)=300, n1: score=max(50,100)=100
      expect(result.map((n) => n.id)).toEqual(['n3', 'n1'])
    })

    it('置顶笔记排在非置顶之前', () => {
      const access: RecentNoteAccess[] = [
        { noteId: 'n3', openedAt: 500 },
        { noteId: 'n2', openedAt: 100 },
      ]
      const result = buildRecentNoteList(access, notes)
      // n2 pinned, n3 not pinned - n2 should be first despite lower score
      expect(result.map((n) => n.id)).toEqual(['n2', 'n3'])
    })

    it('同组内置顶笔记按 score 降序', () => {
      const pinnedNotes: NoteListItem[] = [
        { id: 'p1', title: 'P1', updatedAt: 100, pinned: true },
        { id: 'p2', title: 'P2', updatedAt: 200, pinned: true },
      ]
      const access: RecentNoteAccess[] = [
        { noteId: 'p1', openedAt: 300 },
        { noteId: 'p2', openedAt: 100 },
      ]
      const result = buildRecentNoteList(access, pinnedNotes)
      // p1 score=300, p2 score=200
      expect(result.map((n) => n.id)).toEqual(['p1', 'p2'])
    })

    it('尊重 limit 参数', () => {
      const access: RecentNoteAccess[] = notes.map((n, i) => ({
        noteId: n.id,
        openedAt: (i + 1) * 100,
      }))
      const result = buildRecentNoteList(access, notes, 2)
      expect(result).toHaveLength(2)
    })
  })
})

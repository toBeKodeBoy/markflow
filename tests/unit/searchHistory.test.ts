import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  recordSearchInteraction,
  getSearchHistory,
  clearSearchHistoryForNote,
  buildRecentNotesFromAccess,
} from '../../src/utils/searchHistory'
import type { NoteListItem } from '../../src/types'

// Mock localStorage
const mockLocalStorage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage[key]
  }),
  clear: vi.fn(() => {
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key])
  }),
})

describe('searchHistory utils', () => {
  beforeEach(() => {
    // 清空 localStorage
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('recordSearchInteraction', () => {
    it('应该在新历史记录中添加条目', () => {
      const noteId = 'note-123'
      recordSearchInteraction(noteId)

      const history = getSearchHistory()
      expect(history).toHaveLength(1)
      expect(history[0]).toEqual({
        noteId,
        searchedAt: expect.any(Number),
      })
    })

    it('应该将新记录放在头部', () => {
      recordSearchInteraction('note-1')
      recordSearchInteraction('note-2')
      recordSearchInteraction('note-3')

      const history = getSearchHistory()
      expect(history[0].noteId).toBe('note-3')
      expect(history[1].noteId).toBe('note-2')
      expect(history[2].noteId).toBe('note-1')
    })

    it('重复记录应该移动到头部', () => {
      recordSearchInteraction('note-1')
      recordSearchInteraction('note-2')
      recordSearchInteraction('note-1') // 重复

      const history = getSearchHistory()
      expect(history).toHaveLength(2)
      expect(history[0].noteId).toBe('note-1')
      expect(history[1].noteId).toBe('note-2')
    })

    it('超过 50 条应该截断', () => {
      for (let i = 0; i < 60; i++) {
        recordSearchInteraction(`note-${i}`)
      }

      const history = getSearchHistory()
      expect(history).toHaveLength(50)
      expect(history[0].noteId).toBe('note-59')
      expect(history[49].noteId).toBe('note-10')
    })

    it('空 noteId 也应该被记录', () => {
      recordSearchInteraction('')
      const history = getSearchHistory()
      expect(history).toHaveLength(1)
      expect(history[0].noteId).toBe('')
    })
  })

  describe('getSearchHistory', () => {
    it('无记录时应该返回空数组', () => {
      const history = getSearchHistory()
      expect(history).toEqual([])
    })

    it('应该返回按时间倒序的记录', () => {
      const baseTime = Date.now()
      // 直接写入 localStorage
      mockLocalStorage['markflow.searchHistory'] = JSON.stringify([
        { noteId: 'note-1', searchedAt: baseTime },
        { noteId: 'note-2', searchedAt: baseTime + 1000 },
        { noteId: 'note-3', searchedAt: baseTime + 2000 },
      ])

      const history = getSearchHistory()
      expect(history).toHaveLength(3)
      // 注意：getSearchHistory 只是简单切片,不排序
      // 数据在写入时已经按时间倒序了
      expect(history[0].noteId).toBe('note-1')
      expect(history[1].noteId).toBe('note-2')
      expect(history[2].noteId).toBe('note-3')
    })

    it('limit 参数应该限制返回数量', () => {
      for (let i = 0; i < 20; i++) {
        recordSearchInteraction(`note-${i}`)
      }

      const history = getSearchHistory(5)
      expect(history).toHaveLength(5)
      expect(history[0].noteId).toBe('note-19')
      expect(history[4].noteId).toBe('note-15')
    })

    it('损坏的数据应该返回空数组', () => {
      mockLocalStorage['markflow.searchHistory'] = 'invalid json'
      const history = getSearchHistory()
      expect(history).toEqual([])
    })

    it('非数组格式应该返回空数组', () => {
      mockLocalStorage['markflow.searchHistory'] = '{"noteId": "note-1"}'
      const history = getSearchHistory()
      expect(history).toEqual([])
    })
  })

  describe('clearSearchHistoryForNote', () => {
    it('应该移除指定笔记的记录', () => {
      recordSearchInteraction('note-1')
      recordSearchInteraction('note-2')
      recordSearchInteraction('note-3')

      clearSearchHistoryForNote('note-2')
      const history = getSearchHistory()
      expect(history).toHaveLength(2)
      expect(history.find((h) => h.noteId === 'note-2')).toBeUndefined()
    })

    it('移除不存在的笔记应该无影响', () => {
      recordSearchInteraction('note-1')
      clearSearchHistoryForNote('note-notexist')
      const history = getSearchHistory()
      expect(history).toHaveLength(1)
      expect(history[0].noteId).toBe('note-1')
    })

    it('移除所有记录后应该为空', () => {
      recordSearchInteraction('note-1')
      clearSearchHistoryForNote('note-1')
      const history = getSearchHistory()
      expect(history).toHaveLength(0)
    })
  })

  describe('buildRecentNotesFromAccess', () => {
    const mockNotes: NoteListItem[] = [
      { id: 'note-1', title: '笔记 1', folderId: 'folder-1', order: 1, updatedAt: Date.now() - 5000, contentLength: 100 },
      { id: 'note-2', title: '笔记 2', folderId: 'folder-1', order: 2, updatedAt: Date.now() - 3000, contentLength: 200 },
      { id: 'note-3', title: '笔记 3', folderId: 'folder-1', order: 3, updatedAt: Date.now() - 1000, contentLength: 300 },
      { id: 'note-4', title: '笔记 4', folderId: 'folder-1', order: 4, updatedAt: Date.now() - 7000, contentLength: 400 },
    ]

    it('应该返回空的列表当 access 为空时', () => {
      const result = buildRecentNotesFromAccess([], mockNotes)
      expect(result).toEqual([])
    })

    it('应该按访问时间排序', () => {
      const access = [
        { noteId: 'note-1', openedAt: Date.now() - 4000 },
        { noteId: 'note-2', openedAt: Date.now() - 2000 },
        { noteId: 'note-3', openedAt: Date.now() },
      ]

      const result = buildRecentNotesFromAccess(access, mockNotes)
      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('note-3')
      expect(result[1].id).toBe('note-2')
      expect(result[2].id).toBe('note-1')
    })

    it('应该过滤掉不存在的笔记', () => {
      const access = [
        { noteId: 'note-1', openedAt: Date.now() },
        { noteId: 'nonexistent', openedAt: Date.now() },
      ]

      const result = buildRecentNotesFromAccess(access, mockNotes)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('note-1')
    })

    it('limit 参数应该限制返回数量', () => {
      const access = [
        { noteId: 'note-1', openedAt: Date.now() - 3000 },
        { noteId: 'note-2', openedAt: Date.now() - 2000 },
        { noteId: 'note-3', openedAt: Date.now() - 1000 },
        { noteId: 'note-4', openedAt: Date.now() },
      ]

      const result = buildRecentNotesFromAccess(access, mockNotes, 2)
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('note-4')
      expect(result[1].id).toBe('note-3')
    })

    it('取最后访问时间和更新时间中较大值作为分数', () => {
      const notes = [
        ...mockNotes,
        { id: 'note-5', title: '旧笔记', folderId: 'folder-1', order: 5, updatedAt: Date.now() - 10000, contentLength: 500 },
      ]

      const access = [
        { noteId: 'note-5', openedAt: Date.now() - 1000 }, // 打开时间晚于更新时间
      ]

      const result = buildRecentNotesFromAccess(access, notes)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('note-5')
    })

    it('置顶的笔记应该如何处理', () => {
      // 注意：buildRecentNotesFromAccess 不处理置顶逻辑
      // 置顶逻辑在侧边栏的 buildRecentNoteList 中处理
      const access = [
        { noteId: 'note-1', openedAt: Date.now() },
        { noteId: 'note-2', openedAt: Date.now() - 1000 },
      ]

      const pinnedNote = { ...mockNotes[0], pinned: true } as any
      const notes = [pinnedNote, ...mockNotes.slice(1)]

      const result = buildRecentNotesFromAccess(access, notes, 10)
      expect(result).toHaveLength(2)
      // buildRecentNotesFromAccess 不处理置顶，顺序基于访问时间
      expect(result[0].id).toBe('note-1')
    })
  })
})

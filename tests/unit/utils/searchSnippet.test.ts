import { describe, it, expect } from 'vitest'
import {
  splitHighlightSegments,
  buildSearchSnippet,
  getSearchMatchInfo,
  fuzzyMatch,
} from '../../../src/utils/searchSnippet'
import type { NoteListItem } from '../../../src/types'

describe('searchSnippet', () => {
  describe('splitHighlightSegments', () => {
    it('marks matching substring', () => {
      expect(splitHighlightSegments('hello world', 'wor')).toEqual([
        { text: 'hello ', highlight: false },
        { text: 'wor', highlight: true },
        { text: 'ld', highlight: false },
      ])
    })

    it('returns single segment when no match', () => {
      expect(splitHighlightSegments('abc', 'z')).toEqual([{ text: 'abc', highlight: false }])
    })
  })

  describe('buildSearchSnippet', () => {
    it('extracts context around body match', () => {
      const content = 'prefix ' + 'x'.repeat(80) + ' KEYWORD tail'
      const snippet = buildSearchSnippet(content, 'keyword', 40)
      expect(snippet.some((s) => s.highlight && s.text.toLowerCase().includes('keyword'))).toBe(true)
    })
  })

  describe('getSearchMatchInfo', () => {
    const note: NoteListItem = {
      id: '1',
      title: 'My Title',
      updatedAt: 0,
      tags: ['work'],
    }

    it('prefers title match', () => {
      const info = getSearchMatchInfo(note, 'title', 'My Title')
      expect(info.kind).toBe('title')
    })

    it('detects tag match', () => {
      const info = getSearchMatchInfo(note, 'work', 'My Title')
      expect(info.kind).toBe('tag')
    })

    it('detects body match from content', () => {
      const info = getSearchMatchInfo(note, 'needle', 'body with needle here')
      expect(info.kind).toBe('body')
      expect(info.segments.length).toBeGreaterThan(0)
    })
  })

  describe('fuzzyMatch', () => {
    it('空 query 返回未匹配', () => {
      const result = fuzzyMatch('hello', '')
      expect(result.matched).toBe(false)
      expect(result.score).toBe(0)
    })

    it('连续子串匹配返回最高分', () => {
      const result = fuzzyMatch('笔记标签管理', '笔记')
      expect(result.matched).toBe(true)
      expect(result.indices).toEqual([0, 1])
      expect(result.score).toBeGreaterThan(0)
    })

    it('非连续字符也能匹配（模糊）', () => {
      const result = fuzzyMatch('笔记标签管理', '记标')
      expect(result.matched).toBe(true)
      expect(result.indices).toContain(1)
      expect(result.indices).toContain(2)
    })

    it('无法匹配时返回 matched=false', () => {
      const result = fuzzyMatch('hello', 'xyz')
      expect(result.matched).toBe(false)
      expect(result.score).toBe(0)
      expect(result.indices).toEqual([])
    })

    it('大小写不敏感', () => {
      const result = fuzzyMatch('Hello World', 'hw')
      expect(result.matched).toBe(true)
      expect(result.indices.length).toBe(2)
    })

    it('匹配越靠前分数越高', () => {
      const early = fuzzyMatch('abc', 'a')
      const late = fuzzyMatch('abc', 'c')
      expect(early.score).toBeGreaterThanOrEqual(late.score)
    })

    it('连续匹配比分散匹配分数高', () => {
      const contiguous = fuzzyMatch('abcdef', 'abc')
      const scattered = fuzzyMatch('abcdef', 'ac')
      expect(contiguous.score).toBeGreaterThanOrEqual(scattered.score)
    })

    it('中文字符也能模糊匹配', () => {
      const result = fuzzyMatch('项目周报工作总结', '周工')
      expect(result.matched).toBe(true)
      expect(result.indices).toContain(2)
      expect(result.indices).toContain(4)
    })

    it('单词边界匹配获得更高分数', () => {
      const atBoundary = fuzzyMatch('note/hello', 'hello')
      const midWord = fuzzyMatch('noteworthy', 'oth')
      expect(atBoundary.score).toBeGreaterThan(midWord.score)
    })

    it('query 长度超过 text 时返回未匹配', () => {
      const result = fuzzyMatch('ab', 'abc')
      expect(result.matched).toBe(false)
    })
  })
})

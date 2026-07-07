import { describe, it, expect } from 'vitest'
import {
  splitHighlightSegments,
  buildSearchSnippet,
  getSearchMatchInfo,
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
})

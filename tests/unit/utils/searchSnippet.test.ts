import { describe, it, expect } from 'vitest'
import {
  splitHighlightSegments,
  buildSearchSnippet,
  getSearchMatchInfo,
  fuzzyMatch,
} from '../../../src/utils/searchSnippet'
import type { NoteListItem } from '../../../src/types'

describe('searchSnippet', () => {
  it('splitHighlightSegments marks matching substring', () => {
    expect(splitHighlightSegments('hello world', 'wor')).toEqual([
      { text: 'hello ', highlight: false },
      { text: 'wor', highlight: true },
      { text: 'ld', highlight: false },
    ])
  })

  it('buildSearchSnippet extracts context around body match', () => {
    const content = 'prefix ' + 'x'.repeat(80) + ' KEYWORD tail'
    const snippet = buildSearchSnippet(content, 'keyword', 40)
    expect(snippet.some((s) => s.highlight && s.text.toLowerCase().includes('keyword'))).toBe(true)
  })

  it('getSearchMatchInfo prefers title match', () => {
    const note: NoteListItem = {
      id: '1',
      title: 'My Title',
      updatedAt: 0,
    }
    const info = getSearchMatchInfo(note, 'title', 'body content')
    expect(info.kind).toBe('title')
  })

  it('getSearchMatchInfo falls back to body match', () => {
    const note: NoteListItem = {
      id: '1',
      title: 'My Title',
      updatedAt: 0,
    }
    const info = getSearchMatchInfo(note, 'needle', 'body with needle here')
    expect(info.kind).toBe('body')
    expect(info.segments.length).toBeGreaterThan(0)
  })

  it('fuzzyMatch supports case-insensitive fuzzy matching', () => {
    const result = fuzzyMatch('Hello World', 'hw')
    expect(result.matched).toBe(true)
    expect(result.indices.length).toBe(2)
  })
})

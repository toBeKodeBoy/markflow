/**
 * 搜索摘要与高亮分段 — TDD
 * @file tests/unit/utils/searchSnippet.test.ts
 */
import { describe, it, expect } from 'vitest'
import {
  buildSearchSnippet,
  splitHighlightSegments,
  getSearchMatchInfo,
} from '../../../src/utils/searchSnippet'
import type { NoteListItem } from '../../../src/types'

describe('splitHighlightSegments', () => {
  it('应将匹配词标记为 highlight', () => {
    const segments = splitHighlightSegments('hello world', 'world')
    expect(segments).toEqual([
      { text: 'hello ', highlight: false },
      { text: 'world', highlight: true },
    ])
  })

  it('应支持大小写不敏感匹配但保留原文大小写', () => {
    const segments = splitHighlightSegments('Hello WORLD', 'world')
    expect(segments).toEqual([
      { text: 'Hello ', highlight: false },
      { text: 'WORLD', highlight: true },
    ])
  })

  it('应高亮多处匹配', () => {
    const segments = splitHighlightSegments('foo bar foo', 'foo')
    expect(segments).toEqual([
      { text: 'foo', highlight: true },
      { text: ' bar ', highlight: false },
      { text: 'foo', highlight: true },
    ])
  })

  it('query 为空时返回整段非高亮', () => {
    expect(splitHighlightSegments('abc', '')).toEqual([{ text: 'abc', highlight: false }])
  })
})

describe('buildSearchSnippet', () => {
  it('应提取命中位置前后上下文', () => {
    const content = 'a'.repeat(50) + 'KEYWORD' + 'b'.repeat(50)
    const segments = buildSearchSnippet(content, 'keyword', 10)
    const text = segments.map((s) => s.text).join('')
    expect(text).toContain('KEYWORD')
    expect(text.length).toBeLessThanOrEqual(10 + 'KEYWORD'.length + 10 + 2)
  })

  it('命中在开头时不加前省略号', () => {
    const segments = buildSearchSnippet('keyword at start', 'keyword')
    expect(segments[0].text.startsWith('…')).toBe(false)
  })

  it('命中在末尾时不加后省略号', () => {
    const segments = buildSearchSnippet('ends with keyword', 'keyword')
    const joined = segments.map((s) => s.text).join('')
    expect(joined.endsWith('…')).toBe(false)
  })

  it('中间命中应加前后省略号', () => {
    const content = 'x'.repeat(60) + 'findme' + 'y'.repeat(60)
    const joined = buildSearchSnippet(content, 'findme', 5).map((s) => s.text).join('')
    expect(joined.startsWith('…')).toBe(true)
    expect(joined.endsWith('…')).toBe(true)
  })

  it('应剥离常见 Markdown 标记', () => {
    const content = 'prefix ## **bold** `code` [link](url) keyword suffix'
    const joined = buildSearchSnippet(content, 'keyword', 20).map((s) => s.text).join('')
    expect(joined).not.toContain('##')
    expect(joined).not.toContain('**')
    expect(joined).toContain('keyword')
  })

  it('未命中时返回空数组', () => {
    expect(buildSearchSnippet('no match here', 'xyz')).toEqual([])
  })

  it('query 为空时返回空数组', () => {
    expect(buildSearchSnippet('content', '')).toEqual([])
  })

  it('摘要内关键词应高亮', () => {
    const segments = buildSearchSnippet('hello search world', 'search')
    expect(segments.some((s) => s.highlight && s.text.toLowerCase() === 'search')).toBe(true)
  })

  it('Markdown 包裹的关键词仍应高亮', () => {
    const segments = buildSearchSnippet('intro **keyword** outro', 'keyword')
    expect(segments.some((s) => s.highlight && s.text.toLowerCase() === 'keyword')).toBe(true)
  })
})

describe('getSearchMatchInfo', () => {
  const baseNote: NoteListItem = {
    id: 'n1',
    title: '开发计划',
    updatedAt: Date.now(),
  }

  it('标题命中应包含 title kind', () => {
    const info = getSearchMatchInfo(baseNote, '开发', undefined)
    expect(info.kinds).toContain('title')
    expect(info.snippet).toBeNull()
  })

  it('正文命中应包含 body kind 与摘要', () => {
    const info = getSearchMatchInfo(baseNote, 'markdown', '本地 Markdown 笔记插件')
    expect(info.kinds).toContain('body')
    expect(info.snippet).not.toBeNull()
    expect(info.snippet!.some((s) => s.highlight)).toBe(true)
  })

  it('标签命中应包含 tag kind 与 matchedTag', () => {
    const note: NoteListItem = { ...baseNote, tags: ['工作', '笔记'] }
    const info = getSearchMatchInfo(note, '工作', undefined)
    expect(info.kinds).toContain('tag')
    expect(info.matchedTag).toBe('工作')
  })

  it('可同时命中标题与正文', () => {
    const info = getSearchMatchInfo(baseNote, '开发', '关于开发的详细说明')
    expect(info.kinds).toContain('title')
    expect(info.kinds).toContain('body')
    expect(info.snippet).not.toBeNull()
  })

  it('query 为空时 kinds 为空', () => {
    const info = getSearchMatchInfo(baseNote, '  ', 'content')
    expect(info.kinds).toEqual([])
    expect(info.snippet).toBeNull()
  })
})

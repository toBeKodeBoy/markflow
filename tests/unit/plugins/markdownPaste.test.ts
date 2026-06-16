import { describe, it, expect } from 'vitest'
import { looksLikeMarkdown } from '@/plugins/markdownPaste'

describe('looksLikeMarkdown', () => {
  it('识别标题语法', () => {
    expect(looksLikeMarkdown('# Hello')).toBe(true)
    expect(looksLikeMarkdown('## World')).toBe(true)
  })

  it('识别强调与列表', () => {
    expect(looksLikeMarkdown('**bold** text')).toBe(true)
    expect(looksLikeMarkdown('- item')).toBe(true)
    expect(looksLikeMarkdown('1. item')).toBe(true)
  })

  it('普通句子返回 false', () => {
    expect(looksLikeMarkdown('Hello world')).toBe(false)
    expect(looksLikeMarkdown('')).toBe(false)
  })
})

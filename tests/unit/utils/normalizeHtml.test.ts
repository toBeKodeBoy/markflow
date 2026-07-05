import { describe, it, expect } from 'vitest'
import { normalizeHtmlMarkdown, parseMarkdown } from '@/utils/markedSetup'

describe('normalizeHtmlMarkdown', () => {
  it('应还原 remark-stringify 转义的 HTML 标签', () => {
    expect(normalizeHtmlMarkdown(String.raw`\<span>abc\</span>`)).toBe('<span>abc</span>')
  })
})

describe('parseMarkdown + normalizeHtmlMarkdown', () => {
  it('分屏预览应渲染被转义存储的 span', () => {
    const html = parseMarkdown(String.raw`\<span>abc\</span>`)
    expect(html).toContain('<span>abc</span>')
    expect(html).not.toContain('\\<span>')
  })
})

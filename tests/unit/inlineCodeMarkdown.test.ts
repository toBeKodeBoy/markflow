import { describe, it, expect } from 'vitest'
import { parseMarkdown } from '../../src/utils/markedSetup'

describe('parseMarkdown inline code', () => {
  it('renders inline code inside paragraph, not as pre block', () => {
    const html = parseMarkdown('使用 `console.log` 调试')
    expect(html).toMatch(/<p>[\s\S]*<code>console\.log<\/code>[\s\S]*<\/p>/)
    expect(html).not.toContain('<pre>')
  })

  it('keeps inline code on same line as surrounding text in HTML', () => {
    const html = parseMarkdown('before `mid` after')
    expect(html).toContain('before')
    expect(html).toContain('<code>mid</code>')
    expect(html).toContain('after')
    expect(html).not.toMatch(/<p>\s*<code>/)
  })

  it('still renders fenced code blocks separately from inline code', () => {
    const html = parseMarkdown('`inline`\n\n```js\nblock\n```')
    expect(html).toContain('<code>inline</code>')
    expect(html).toContain('<pre>')
    expect(html).toContain('code-block-wrapper')
  })
})

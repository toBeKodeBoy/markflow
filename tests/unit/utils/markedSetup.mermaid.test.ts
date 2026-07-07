/**
 * @file tests/unit/utils/markedSetup.mermaid.test.ts
 */
import { describe, it, expect } from 'vitest'
import { parseMarkdown } from '../../../src/utils/markedSetup'

describe('parseMarkdown mermaid', () => {
  it('```mermaid 代码块应输出 mermaid 占位而非 hljs', () => {
    const html = parseMarkdown('```mermaid\ngraph TD;\n  A-->B\n```')
    expect(html).toContain('mermaid-diagram-wrapper')
    expect(html).toContain('<pre class="mermaid">')
    expect(html).toContain('A--&gt;B')
    expect(html).not.toContain('hljs')
  })

  it('普通代码块仍应使用 hljs 高亮', () => {
    const html = parseMarkdown('```javascript\nconst x = 1\n```')
    expect(html).toContain('hljs')
    expect(html).not.toContain('mermaid-diagram-wrapper')
  })

  it('mermaid 块与正文可共存', () => {
    const html = parseMarkdown('前文\n\n```mermaid\ngraph LR;\n  X-->Y\n```\n\n后文')
    expect(html).toContain('前文')
    expect(html).toContain('后文')
    expect(html).toContain('graph LR')
  })
})

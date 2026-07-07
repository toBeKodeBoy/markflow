/**
 * @file tests/unit/utils/markedSetup.math.test.ts
 */
import { describe, it, expect } from 'vitest'
import { parseMarkdown } from '../../../src/utils/markedSetup'

describe('parseMarkdown math', () => {
  it('行内 $...$ 应渲染 katex', () => {
    const html = parseMarkdown('公式 $E=mc^2$ 结束')
    expect(html).toContain('class="katex"')
    expect(html).toContain('公式')
    expect(html).toContain('结束')
  })

  it('块级 $$...$$ 应渲染 katex-display', () => {
    const html = parseMarkdown('$$\\int_0^1 x\\,dx$$')
    expect(html).toContain('katex-display')
  })

  it('三行块级 $$...$$ 应渲染 katex-display', () => {
    const html = parseMarkdown('$$\n\\int_0^1 x\\,dx\n$$')
    expect(html).toContain('katex-display')
  })

  it('行内代码中的 $ 不应被当作公式', () => {
    const html = parseMarkdown('使用 `$x$` 变量')
    expect(html).not.toContain('katex')
    expect(html).toContain('$x$')
  })

  it('货币 $5 不应被当作公式', () => {
    const html = parseMarkdown('价格 $5 美元')
    expect(html).not.toContain('katex')
    expect(html).toContain('$5')
  })
})

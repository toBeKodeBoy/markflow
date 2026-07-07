/**
 * @file tests/unit/utils/mathRender.test.ts
 */
import { describe, it, expect } from 'vitest'
import { renderInlineMath, renderBlockMath } from '../../../src/utils/mathRender'

describe('mathRender', () => {
  describe('renderInlineMath', () => {
    it('应渲染行内公式为 katex HTML', () => {
      const html = renderInlineMath('E=mc^2')
      expect(html).toContain('class="katex"')
      expect(html).not.toContain('katex-display')
    })

    it('无效 LaTeX 应降级为原文本而非抛错', () => {
      const html = renderInlineMath('\\bad{cmd')
      expect(html).toContain('katex-error')
    })
  })

  describe('renderBlockMath', () => {
    it('应渲染块级公式为 katex-display', () => {
      const html = renderBlockMath('\\int_0^1 x\\,dx')
      expect(html).toContain('katex-display')
    })

    it('无效 LaTeX 应降级而非抛错', () => {
      expect(() => renderBlockMath('\\bad{cmd')).not.toThrow()
    })
  })
})

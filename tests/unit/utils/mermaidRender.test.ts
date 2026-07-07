/**
 * @file tests/unit/utils/mermaidRender.test.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  renderMermaidBlock,
  renderMermaidToSvg,
  hydrateMermaidBlocks,
  resetMermaidStateForTests,
  isMermaidLanguage,
} from '../../../src/utils/mermaidRender'

describe('mermaidRender', () => {
  beforeEach(() => {
    resetMermaidStateForTests()
  })

  describe('isMermaidLanguage', () => {
    it('应识别 mermaid 语言标识', () => {
      expect(isMermaidLanguage('mermaid')).toBe(true)
      expect(isMermaidLanguage('Mermaid')).toBe(true)
      expect(isMermaidLanguage('javascript')).toBe(false)
    })
  })

  describe('renderMermaidBlock', () => {
    it('应输出 pre.mermaid 占位结构', () => {
      const html = renderMermaidBlock('graph TD;\n  A-->B')
      expect(html).toContain('mermaid-diagram-wrapper')
      expect(html).toContain('<pre class="mermaid">')
      expect(html).toContain('A--&gt;B')
      expect(html).not.toContain('hljs')
    })

    it('无效语法仍应输出占位（客户端渲染时再报错）', () => {
      const html = renderMermaidBlock('not valid mermaid {{{')
      expect(html).toContain('<pre class="mermaid">')
    })
  })

  describe('renderMermaidToSvg', () => {
    it('应渲染 flowchart 为 SVG', async () => {
      const svg = await renderMermaidToSvg('graph TD;\n  A-->B')
      expect(svg).toContain('<svg')
    }, 30000)

    it('语法错误应返回 mermaid-error 而非抛错', async () => {
      const html = await renderMermaidToSvg('not valid mermaid {{{')
      expect(html).toContain('mermaid-error')
    }, 30000)
  })

  describe('hydrateMermaidBlocks', () => {
    it('应在容器内将占位渲染为 SVG', async () => {
      const root = document.createElement('div')
      root.innerHTML = renderMermaidBlock('graph TD;\n  A-->B')
      await hydrateMermaidBlocks(root)
      expect(root.querySelector('svg')).toBeTruthy()
    }, 30000)
  })
})

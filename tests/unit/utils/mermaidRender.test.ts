/**
 * @file tests/unit/utils/mermaidRender.test.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  renderMermaidBlock,
  renderMermaidToSvg,
  hydrateMermaidBlocks,
  refreshMermaidBlocks,
  resetMermaidStateForTests,
  isMermaidLanguage,
  decodeMermaidSource,
} from '../../../src/utils/mermaidRender'
import { sanitizeMermaidSvg } from '../../../src/utils/sanitizeHtml'

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

    it('hydrate 后应保留 data-mermaid-source 供复制与刷新', async () => {
      const root = document.createElement('div')
      const source = 'graph TD;\n  A-->B'
      root.innerHTML = renderMermaidBlock(source)
      await hydrateMermaidBlocks(root)
      const rendered = root.querySelector('.mermaid-rendered') as HTMLElement
      expect(rendered?.dataset.mermaidSource).toBeTruthy()
      expect(decodeMermaidSource(rendered.dataset.mermaidSource!)).toBe(source)
    }, 30000)
  })

  describe('refreshMermaidBlocks', () => {
    it('应重渲染已 hydrate 的图示', async () => {
      const root = document.createElement('div')
      root.innerHTML = renderMermaidBlock('graph TD;\n  A-->B')
      await hydrateMermaidBlocks(root)
      const before = root.innerHTML
      await refreshMermaidBlocks(root)
      expect(root.querySelector('svg')).toBeTruthy()
      expect(root.querySelector('.mermaid-rendered[data-mermaid-source]')).toBeTruthy()
      expect(root.innerHTML).not.toBe('')
      expect(before).not.toBe('')
    }, 30000)
  })

  describe('sanitizeMermaidSvg', () => {
    it('应原样保留 mermaid SVG（含 foreignObject 标签）', () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><span>开始</span></foreignObject></svg>'
      const clean = sanitizeMermaidSvg(svg)
      expect(clean).toContain('foreignObject')
      expect(clean).toContain('开始')
    })

    it('非 SVG 错误块应原样返回', () => {
      const err = '<div class="mermaid-error">syntax error</div>'
      expect(sanitizeMermaidSvg(err)).toBe(err)
    })
  })
})

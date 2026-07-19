/**
 * @file tests/unit/utils/printDocument.test.ts
 */
import { describe, it, expect } from 'vitest'
import {
  assemblePrintDocument,
  buildPdfDocument,
  buildPrintDocument,
} from '../../../src/utils/printDocument'

describe('buildPrintDocument', () => {
  it('应生成完整 HTML 文档并渲染 Markdown', () => {
    const html = buildPrintDocument('# Hello\n\nworld', '测试文档', {
      pageSize: 'A4',
      margin: 'default',
      printBackground: true,
      landscape: 'portrait',
      scale: 1,
      displayHeaderFooter: false,
      preferCssPageSize: true,
    })
    expect(html).toMatch(/^<!DOCTYPE html>/)
    expect(html).toContain('<title>测试文档</title>')
    expect(html).toContain('Hello')
    expect(html).toContain('@page')
    expect(html).toContain('size: A4')
    expect(html).toContain('margin: 20mm 15mm')
  })

  it('printBackground=false 时应禁用背景色样式', () => {
    const html = assemblePrintDocument('<pre>code</pre>', 'Doc', {
      printBackground: false,
    })
    expect(html).toContain('background: transparent !important')
  })

  it('应注入打印就绪脚本与更细粒度打印样式', () => {
    const html = assemblePrintDocument('<table><thead><tr><th>A</th></tr></thead></table>', 'Doc', {
      landscape: 'landscape',
      scale: 1,
    })
    expect(html).toContain('window.__MARKFLOW_PDF_READY__ = false')
    expect(html).toContain('size: A4 landscape')
    expect(html).toContain('display: table-header-group')
  })

  it('PDF 导出文档应预渲染 mermaid SVG', async () => {
    const html = await buildPdfDocument('```mermaid\ngraph TD;\n  A-->B\n```', '图表', {
      scale: 1,
    })
    expect(html).toContain('mermaid-rendered')
    expect(html).toContain('<svg')
    expect(html).not.toContain('<pre class="mermaid">')
  })
})

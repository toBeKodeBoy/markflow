/**
 * @file tests/unit/utils/printDocument.test.ts
 */
import { describe, it, expect } from 'vitest'
import { assemblePrintDocument, buildPrintDocument } from '../../../src/utils/printDocument'

describe('buildPrintDocument', () => {
  it('应生成完整 HTML 文档并渲染 Markdown', () => {
    const html = buildPrintDocument('# Hello\n\nworld', '测试文档', {
      pageSize: 'A4',
      margin: 'default',
      printBackground: true,
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
})

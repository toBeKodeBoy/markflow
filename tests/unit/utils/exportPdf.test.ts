/**
 * @file tests/unit/utils/exportPdf.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { exportPdf, pdfExporting, sanitizeFilename } from '../../../src/utils/exportPdf'

describe('sanitizeFilename', () => {
  it('应替换非法字符并 trim', () => {
    expect(sanitizeFilename('  foo/bar:baz  ')).toBe('foo_bar_baz')
    expect(sanitizeFilename('')).toBe('untitled')
  })
})

describe('exportPdf', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    localStorage.clear()
    pdfExporting.value = false
    vi.restoreAllMocks()

    const { useNoteStore } = await import('../../../src/stores/note')
    const store = useNoteStore()
    store.createNoteWithContent('# PDF 测试\n正文')
  })

  it('uTools 环境应调用 savePdfFromHtml', async () => {
    const savePdfFromHtml = vi.fn().mockResolvedValue({ ok: true })
    window.markflow.savePdfFromHtml = savePdfFromHtml

    await exportPdf({
      pageSize: 'A4',
      margin: 'default',
      printBackground: true,
      landscape: 'landscape',
      scale: 0.9,
      displayHeaderFooter: true,
      preferCssPageSize: false,
    })

    expect(savePdfFromHtml).toHaveBeenCalledTimes(1)
    const [filename, html, options] = savePdfFromHtml.mock.calls[0]
    expect(filename).toBe('PDF 测试.pdf')
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('PDF 测试')
    expect(options).toMatchObject({
      landscape: 'landscape',
      scale: 0.9,
      displayHeaderFooter: true,
      preferCssPageSize: false,
    })
  })

  it('包含 mermaid 时应导出预渲染 SVG', async () => {
    const { useNoteStore } = await import('../../../src/stores/note')
    const store = useNoteStore()
    store.updateCurrentContent('```mermaid\ngraph TD;\n  A-->B\n```')

    const savePdfFromHtml = vi.fn().mockResolvedValue({ ok: true })
    window.markflow.savePdfFromHtml = savePdfFromHtml

    await exportPdf()

    const [, html] = savePdfFromHtml.mock.calls[0]
    expect(html).toContain('mermaid-rendered')
    expect(html).toContain('<svg')
  })

  it('文档过大时应中止导出', async () => {
    const { useNoteStore } = await import('../../../src/stores/note')
    const store = useNoteStore()
    store.updateCurrentContent('x'.repeat(20_000_001))

    const savePdfFromHtml = vi.fn()
    window.markflow.savePdfFromHtml = savePdfFromHtml

    await exportPdf()

    expect(savePdfFromHtml).not.toHaveBeenCalled()
  })
})

/**
 * @file tests/unit/utils/pdfOptions.test.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  DEFAULT_PDF_OPTIONS,
  getMarginCss,
  loadPdfOptions,
  normalizePdfOptions,
  savePdfOptions,
} from '../../../src/utils/pdfOptions'

describe('normalizePdfOptions', () => {
  it('缺省值应填充默认 PDF 选项', () => {
    expect(normalizePdfOptions({})).toEqual(DEFAULT_PDF_OPTIONS)
  })

  it('非法枚举应回退默认', () => {
    expect(
      normalizePdfOptions({
        pageSize: 'B5' as never,
        margin: 'huge' as never,
      })
    ).toEqual(DEFAULT_PDF_OPTIONS)
  })

  it('应保留合法 printBackground=false', () => {
    expect(normalizePdfOptions({ printBackground: false }).printBackground).toBe(false)
  })
})

describe('getMarginCss', () => {
  it('应返回对应页边距 CSS', () => {
    expect(getMarginCss('narrow')).toContain('10mm')
    expect(getMarginCss('none')).toContain('5mm')
  })
})

describe('loadPdfOptions / savePdfOptions', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('应读写 AppSettings.pdfExport', () => {
    savePdfOptions({ pageSize: 'Letter', margin: 'wide', printBackground: false })
    expect(loadPdfOptions()).toEqual({
      pageSize: 'Letter',
      margin: 'wide',
      printBackground: false,
    })
  })
})

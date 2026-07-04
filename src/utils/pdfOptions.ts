import type { AppSettings, PdfExportOptions, PdfMarginPreset, PdfPageSize } from '../types'
import { useStorage } from '../composables/useStorage'

export const DEFAULT_PDF_OPTIONS: PdfExportOptions = {
  pageSize: 'A4',
  margin: 'default',
  printBackground: true,
}

export const PDF_PAGE_SIZES: { value: PdfPageSize; label: string }[] = [
  { value: 'A4', label: 'A4' },
  { value: 'A3', label: 'A3' },
  { value: 'Letter', label: 'Letter' },
]

export const PDF_MARGINS: { value: PdfMarginPreset; label: string; css: string }[] = [
  { value: 'default', label: '默认', css: '20mm 15mm' },
  { value: 'narrow', label: '较窄', css: '10mm 10mm' },
  { value: 'wide', label: '较宽', css: '25mm 25mm' },
  { value: 'none', label: '最小', css: '5mm 5mm' },
]

const PAGE_SIZES = new Set<PdfPageSize>(['A4', 'A3', 'Letter'])
const MARGINS = new Set<PdfMarginPreset>(['default', 'narrow', 'wide', 'none'])

/** 规范化并填充默认值 */
export function normalizePdfOptions(raw?: Partial<PdfExportOptions> | null): PdfExportOptions {
  const pageSize = raw?.pageSize && PAGE_SIZES.has(raw.pageSize) ? raw.pageSize : DEFAULT_PDF_OPTIONS.pageSize
  const margin = raw?.margin && MARGINS.has(raw.margin) ? raw.margin : DEFAULT_PDF_OPTIONS.margin
  const printBackground =
    typeof raw?.printBackground === 'boolean'
      ? raw.printBackground
      : DEFAULT_PDF_OPTIONS.printBackground
  return { pageSize, margin, printBackground }
}

export function getMarginCss(margin: PdfMarginPreset): string {
  return PDF_MARGINS.find((m) => m.value === margin)?.css ?? '20mm 15mm'
}

/** 从设置读取 PDF 导出选项 */
export function loadPdfOptions(): PdfExportOptions {
  const storage = useStorage()
  return normalizePdfOptions(storage.getSettings().pdfExport)
}

/** 持久化 PDF 导出选项 */
export function savePdfOptions(options: PdfExportOptions): void {
  const storage = useStorage()
  const settings: AppSettings = {
    ...storage.getSettings(),
    pdfExport: normalizePdfOptions(options),
  }
  storage.saveSettings(settings)
}

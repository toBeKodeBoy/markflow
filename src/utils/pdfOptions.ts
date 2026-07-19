import type {
  AppSettings,
  PdfExportOptions,
  PdfMarginPreset,
  PdfOrientation,
  PdfPageSize,
} from '../types'
import { useStorage } from '../composables/useStorage'

export const DEFAULT_PDF_OPTIONS: PdfExportOptions = {
  pageSize: 'A4',
  margin: 'default',
  printBackground: true,
  landscape: 'portrait',
  scale: 1,
  displayHeaderFooter: false,
  preferCssPageSize: true,
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

export const PDF_ORIENTATIONS: { value: PdfOrientation; label: string }[] = [
  { value: 'portrait', label: '纵向' },
  { value: 'landscape', label: '横向' },
]

export const PDF_SCALE_OPTIONS: { value: number; label: string }[] = [
  { value: 0.8, label: '80%' },
  { value: 0.9, label: '90%' },
  { value: 1, label: '100%' },
  { value: 1.1, label: '110%' },
  { value: 1.2, label: '120%' },
]

const PAGE_SIZES = new Set<PdfPageSize>(['A4', 'A3', 'Letter'])
const MARGINS = new Set<PdfMarginPreset>(['default', 'narrow', 'wide', 'none'])
const ORIENTATIONS = new Set<PdfOrientation>(['portrait', 'landscape'])
const MIN_PDF_SCALE = 0.5
const MAX_PDF_SCALE = 2

/** 规范化并填充默认值 */
export function normalizePdfOptions(raw?: Partial<PdfExportOptions> | null): PdfExportOptions {
  const pageSize = raw?.pageSize && PAGE_SIZES.has(raw.pageSize) ? raw.pageSize : DEFAULT_PDF_OPTIONS.pageSize
  const margin = raw?.margin && MARGINS.has(raw.margin) ? raw.margin : DEFAULT_PDF_OPTIONS.margin
  const landscape =
    raw?.landscape && ORIENTATIONS.has(raw.landscape) ? raw.landscape : DEFAULT_PDF_OPTIONS.landscape
  const printBackground =
    typeof raw?.printBackground === 'boolean'
      ? raw.printBackground
      : DEFAULT_PDF_OPTIONS.printBackground
  const scale =
    typeof raw?.scale === 'number' && Number.isFinite(raw.scale)
      ? Math.min(MAX_PDF_SCALE, Math.max(MIN_PDF_SCALE, raw.scale))
      : DEFAULT_PDF_OPTIONS.scale
  const displayHeaderFooter =
    typeof raw?.displayHeaderFooter === 'boolean'
      ? raw.displayHeaderFooter
      : DEFAULT_PDF_OPTIONS.displayHeaderFooter
  const preferCssPageSize =
    typeof raw?.preferCssPageSize === 'boolean'
      ? raw.preferCssPageSize
      : DEFAULT_PDF_OPTIONS.preferCssPageSize
  return { pageSize, margin, printBackground, landscape, scale, displayHeaderFooter, preferCssPageSize }
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

import type { PdfExportOptions } from '../types'
import { escapeHtml } from './escapeHtml'
import { parseMarkdown } from './markedSetup'
import { buildPrintStyles } from './printStyles'
import { normalizePdfOptions } from './pdfOptions'

/** 将 Markdown（已 resolve asset）渲染为打印用完整 HTML 文档 */
export function buildPrintDocument(
  markdown: string,
  title: string,
  options?: Partial<PdfExportOptions>
): string {
  let bodyHtml = ''
  try {
    bodyHtml = parseMarkdown(markdown)
  } catch {
    bodyHtml = escapeHtml(markdown)
  }
  return assemblePrintDocument(bodyHtml, title, options)
}

/** 由已渲染的 body HTML 组装完整打印文档 */
export function assemblePrintDocument(
  bodyHtml: string,
  title: string,
  options?: Partial<PdfExportOptions>
): string {
  const opts = normalizePdfOptions(options)
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
${buildPrintStyles(opts)}
</style>
</head>
<body class="markdown-body print-root">
${bodyHtml}
</body>
</html>`
}

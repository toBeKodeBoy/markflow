import { ref } from 'vue'
import type { PdfExportOptions } from '../types'
import { useNoteStore } from '../stores/note'
import { showAppNotification } from './notify'
import { resolveMarkdownForDisplay } from './resolveMarkdownAssets'
import { buildPdfDocument } from './printDocument'
import { loadPdfOptions, normalizePdfOptions, savePdfOptions } from './pdfOptions'

/** 导出进行中，供工具栏禁用按钮 */
export const pdfExporting = ref(false)

/** 超过此长度提示较慢；超过上限则中止（含内联 data URL） */
const PDF_WARN_CHARS = 5_000_000
const PDF_MAX_CHARS = 20_000_000

export type PdfSaveResult =
  | boolean
  | { ok: true }
  | {
      ok: false
      reason:
        | 'cancel'
        | 'error'
        | 'ubrowser-unavailable'
        | 'write-temp-failed'
        | 'resource-timeout'
        | 'page-init-failed'
        | 'save-failed'
    }

/**
 * 导出当前笔记为 PDF（Typora 路线：预览同款 HTML + Chromium 排版）。
 *
 * @param options 导出选项；缺省读取并沿用上次设置
 */
export async function exportPdf(options?: Partial<PdfExportOptions>): Promise<void> {
  if (pdfExporting.value) return

  const store = useNoteStore()
  if (!store.currentNote) return

  const opts = normalizePdfOptions(options ?? loadPdfOptions())
  savePdfOptions(opts)

  pdfExporting.value = true
  try {
    const markdown = store.liveContent
    if (markdown !== store.currentNote.content) {
      store.updateCurrentContent(markdown)
    }

    const title = store.currentNote.title
    const content = await resolveMarkdownForDisplay(markdown)

    if (content.length > PDF_MAX_CHARS) {
      showAppNotification('文档过大（含图片），无法导出 PDF，请减少图片后重试')
      return
    }
    if (content.length > PDF_WARN_CHARS) {
      showAppNotification('文档较大，导出可能需要较长时间…')
    }
    const diagnostics = collectPdfExportWarnings(markdown, content)
    if (diagnostics.length > 0) {
      showAppNotification(diagnostics.join('；'))
    }

    const filename = `${sanitizeFilename(title)}.pdf`
    const html = await buildPdfDocument(content, title, opts)

    if (typeof window.markflow !== 'undefined' && window.markflow.savePdfFromHtml) {
      const result = await window.markflow.savePdfFromHtml(filename, html, opts)
      handleNativeSaveResult(result, filename)
    } else {
      showAppNotification('浏览器环境请在打印设置中关闭页眉页脚')
      await printViaBrowser(html)
    }
  } catch (err) {
    console.error('[MarkFlow] PDF 导出失败:', err)
    showAppNotification('PDF 导出失败，请稍后重试')
  } finally {
    pdfExporting.value = false
  }
}

function handleNativeSaveResult(result: PdfSaveResult, filename: string): void {
  const ok = result === true || (typeof result === 'object' && result.ok === true)
  if (ok) {
    showAppNotification('PDF 导出成功：' + filename)
    return
  }
  const reason =
    typeof result === 'object' && result && 'reason' in result ? result.reason : 'error'
  if (reason === 'cancel') return
  if (reason === 'ubrowser-unavailable') {
    showAppNotification('当前 uTools 环境缺少 printToPDF 能力，请升级宿主后重试')
    return
  }
  if (reason === 'write-temp-failed') {
    showAppNotification('PDF 导出失败：文档过大，无法注入打印页面')
    return
  }
  if (reason === 'page-init-failed') {
    showAppNotification('PDF 导出失败：打印页面初始化失败')
    return
  }
  if (reason === 'resource-timeout') {
    showAppNotification('PDF 导出失败：图片、字体或图表加载超时')
    return
  }
  if (reason === 'save-failed') {
    showAppNotification('PDF 导出失败：Chromium 保存 PDF 失败')
    return
  }
  showAppNotification('PDF 导出失败，请稍后重试')
}

/** Windows / 跨平台非法文件名字符 */
export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim()
  return cleaned || 'untitled'
}

/** 浏览器回退：隐藏 iframe 加载打印文档后调用系统打印 */
async function printViaBrowser(html: string): Promise<void> {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) {
    iframe.remove()
    showAppNotification('导出失败：无法创建打印预览')
    return
  }

  doc.open()
  doc.write(html)
  doc.close()

  const ready = await waitForPrintDocumentReady(doc, win)
  if (!ready.ok) {
    cleanupPrintFrame(iframe)
    showAppNotification(
      ready.reason === 'resource-timeout'
        ? '导出失败：打印资源加载超时'
        : '导出失败：打印页面初始化失败'
    )
    return
  }

  const cleanup = () => {
    cleanupPrintFrame(iframe)
  }
  win.onafterprint = cleanup
  setTimeout(cleanup, 60_000)

  win.focus()
  win.print()
}

function cleanupPrintFrame(iframe: HTMLIFrameElement): void {
  try {
    iframe.remove()
  } catch {
    /* ignore */
  }
}

async function waitForPrintDocumentReady(
  doc: Document,
  win: Window,
  timeoutMs = 20_000
): Promise<{ ok: true } | { ok: false; reason: 'resource-timeout' | 'document-init-failed' }> {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const readyState = (win as Window & { __MARKFLOW_PDF_READY__?: boolean | string }).__MARKFLOW_PDF_READY__
    if (readyState === true) return { ok: true }
    if (readyState === 'error') return { ok: false, reason: 'document-init-failed' }

    const imagesReady = Array.from(doc.images).every((img) => img.complete)
    const fontsReady =
      !('fonts' in doc) ||
      !(doc as Document & { fonts?: FontFaceSet }).fonts ||
      (doc as Document & { fonts?: FontFaceSet }).fonts?.status === 'loaded'
    if (imagesReady && fontsReady) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      return { ok: true }
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 60))
  }
  return { ok: false, reason: 'resource-timeout' }
}

function collectPdfExportWarnings(markdown: string, renderedMarkdown: string): string[] {
  const warnings: string[] = []
  const mermaidCount = (markdown.match(/```mermaid\b/gi) ?? []).length
  const dataImageCount = (renderedMarkdown.match(/data:image\//gi) ?? []).length
  const wideTableLine = renderedMarkdown
    .split('\n')
    .some((line) => line.includes('|') && line.length >= 200)

  if (dataImageCount >= 8) {
    warnings.push(`文档包含 ${dataImageCount} 张内联图片，导出可能较慢`)
  }
  if (mermaidCount > 0) {
    warnings.push(`文档包含 ${mermaidCount} 个 Mermaid 图表，首次导出可能稍慢`)
  }
  if (wideTableLine) {
    warnings.push('文档包含较宽表格，PDF 中可能自动换页或缩放')
  }
  return warnings
}

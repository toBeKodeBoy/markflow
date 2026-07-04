import { ref } from 'vue'
import type { PdfExportOptions } from '../types'
import { useNoteStore } from '../stores/note'
import { showAppNotification } from './notify'
import { resolveMarkdownForDisplay } from './resolveMarkdownAssets'
import { buildPrintDocument } from './printDocument'
import { loadPdfOptions, normalizePdfOptions, savePdfOptions } from './pdfOptions'

/** 导出进行中，供工具栏禁用按钮 */
export const pdfExporting = ref(false)

/** 超过此长度提示较慢；超过上限则中止（含内联 data URL） */
const PDF_WARN_CHARS = 5_000_000
const PDF_MAX_CHARS = 20_000_000

export type PdfSaveResult =
  | boolean
  | { ok: true }
  | { ok: false; reason: 'cancel' | 'error' }

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

    const filename = `${sanitizeFilename(title)}.pdf`
    const html = buildPrintDocument(content, title, opts)

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

  await waitForImages(doc)
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

  const cleanup = () => {
    try {
      iframe.remove()
    } catch {
      /* ignore */
    }
  }
  win.onafterprint = cleanup
  setTimeout(cleanup, 60_000)

  win.focus()
  win.print()
}

function waitForImages(doc: Document): Promise<void> {
  const images = Array.from(doc.images)
  if (images.length === 0) return Promise.resolve()

  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve()
            return
          }
          img.onload = () => resolve()
          img.onerror = () => resolve()
        })
    )
  ).then(() => undefined)
}

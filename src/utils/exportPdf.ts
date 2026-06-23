import { useNoteStore } from '../stores/note'
import { showAppNotification } from './notify'
import { marked } from 'marked'
import hljs from 'highlight.js'

/** marked 配置：与 Preview.vue 保持一致 */
marked.setOptions({
  // @ts-ignore
  highlight: (code: string, lang: string) => {
    if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value
    return hljs.highlightAuto(code).value
  },
  breaks: true,
  gfm: true,
} as Parameters<typeof marked.setOptions>[0])

/**
 * 导出当前笔记为 PDF。
 *
 * uTools 环境：走 preload 桥接 → @mdpdf/mdpdf Rust 引擎 → 保存对话框 → 写入文件
 * 浏览器回退：弹出新窗口，渲染 HTML，调用 window.print() → 用户选"另存为 PDF"
 */
export async function exportPdf(): Promise<void> {
  const store = useNoteStore()
  if (!store.currentNote) return

  const title = store.currentNote.title
  const content = store.currentNote.content

  if (typeof window.markflow !== 'undefined' && window.markflow.savePdfFile) {
    // uTools 环境
    const filename = title + '.pdf'
    const result = await window.markflow.savePdfFile(filename, content)
    if (result) {
      window.markflow.showNotification('PDF 导出成功：' + filename)
    }
  } else {
    // 浏览器回退：print()
    openPrintWindow(content, title)
  }
}

function openPrintWindow(markdown: string, title: string): void {
  const html = buildPdfHtml(markdown, title)
  const win = window.open('', '_blank')
  if (!win) {
    showAppNotification('导出失败：浏览器阻止了弹出窗口，请允许弹出窗口后重试')
    return
  }
  win.document.write(html)
  win.document.close()
  win.document.title = title
  // 打印完成后自动关闭窗口
  win.onafterprint = () => win.close()
  win.print()
}

function buildPdfHtml(markdown: string, title: string): string {
  let bodyHtml = ''
  try {
    bodyHtml = marked.parse(markdown, { async: false }) as string
  } catch {
    bodyHtml = escapeHtml(markdown)
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  @page {
    margin: 20mm 15mm;
  }
  * { box-sizing: border-box; }
  body {
    font: 14px/1.7 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', sans-serif;
    color: #333;
    padding: 0;
    margin: 0;
  }
  h1, h2, h3, h4 { page-break-after: avoid; }
  h1 { font-size: 1.6em; border-bottom: 1px solid #eee; padding-bottom: 8px; }
  h2 { font-size: 1.35em; border-bottom: 1px solid #f0f0f0; padding-bottom: 4px; }
  h3 { font-size: 1.2em; }
  pre {
    background: #f6f8fa;
    padding: 14px;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 13px;
    line-height: 1.5;
    page-break-inside: avoid;
  }
  code {
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    background: #f0f0f0;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 0.9em;
  }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; page-break-inside: avoid; }
  th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
  th { background: #f6f8fa; font-weight: 600; }
  tr:nth-child(even) { background: #fafbfc; }
  img { max-width: 100%; height: auto; }
  blockquote {
    border-left: 4px solid #ddd;
    margin: 8px 0;
    padding: 4px 16px;
    color: #666;
  }
  p { margin: 6px 0; }
  ul, ol { padding-left: 24px; }
  hr { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
  a { color: #0366d6; text-decoration: none; }
  .markdown-body { padding: 0; max-width: 100%; }
</style>
</head>
<body class="markdown-body">
${bodyHtml}
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

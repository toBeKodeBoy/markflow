import type { PdfExportOptions } from '../types'
import { escapeHtml } from './escapeHtml'
import { parseMarkdown } from './markedSetup'
import { encodeMermaidSource, renderMermaidToSvg } from './mermaidRender'
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

/** PDF 导出用：在打印 HTML 中提前渲染 Mermaid，并注入导出就绪脚本。 */
export async function buildPdfDocument(
  markdown: string,
  title: string,
  options?: Partial<PdfExportOptions>
): Promise<string> {
  let bodyHtml = ''
  try {
    bodyHtml = parseMarkdown(markdown)
  } catch {
    bodyHtml = escapeHtml(markdown)
  }
  const preparedBodyHtml = await preparePrintBodyHtml(bodyHtml)
  return assemblePrintDocument(preparedBodyHtml, title, options)
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
<script>
${buildPrintReadyScript()}
</script>
</body>
</html>`
}

async function preparePrintBodyHtml(bodyHtml: string): Promise<string> {
  if (!bodyHtml.includes('<pre class="mermaid">') || typeof DOMParser === 'undefined') return bodyHtml

  const doc = new DOMParser().parseFromString(`<body>${bodyHtml}</body>`, 'text/html')
  const nodes = Array.from(doc.querySelectorAll('pre.mermaid')) as HTMLElement[]
  for (const node of nodes) {
    const source = node.textContent?.trim() ?? ''
    if (!source) continue
    const container = doc.createElement('div')
    container.className = 'mermaid-rendered'
    container.dataset.mermaidSource = encodeMermaidSource(source)
    const svg = await renderMermaidWithTimeout(source)
    if (!svg) continue
    container.innerHTML = svg
    node.replaceWith(container)
  }
  return doc.body.innerHTML
}

async function renderMermaidWithTimeout(source: string, timeoutMs = 1500): Promise<string> {
  return await Promise.race([
    renderMermaidToSvg(source),
    new Promise<string>((resolve) => {
      setTimeout(() => resolve(''), timeoutMs)
    }),
  ])
}

function buildPrintReadyScript(): string {
  return `
window.__MARKFLOW_PDF_READY__ = false;
window.__MARKFLOW_PDF_READY_REASON__ = '';
(async function () {
  function timeout(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }
  function waitImages() {
    var images = Array.from(document.images || []);
    if (images.length === 0) return Promise.resolve();
    return Promise.all(images.map(function (img) {
      if (img.complete) return Promise.resolve();
      return new Promise(function (resolve) {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }));
  }
  async function waitFonts() {
    if (!document.fonts || !document.fonts.ready) return;
    await Promise.race([document.fonts.ready, timeout(5000)]);
  }
  await waitImages();
  await waitFonts();
  await new Promise(function (resolve) {
    requestAnimationFrame(function () {
      requestAnimationFrame(resolve);
    });
  });
  document.body.setAttribute('data-print-ready', 'true');
  window.__MARKFLOW_PDF_READY__ = true;
})().catch(function (err) {
  window.__MARKFLOW_PDF_READY_REASON__ = err && err.message ? err.message : String(err || 'unknown');
  window.__MARKFLOW_PDF_READY__ = 'error';
});
`.trim()
}

import DOMPurify from 'dompurify'

/** 与分屏预览一致的 HTML 清洗策略，供 WYSIWYG 内联/块级 HTML 渲染复用 */
export function sanitizeRenderedHtml(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}

/** mermaid hydrate 输出：由 mermaid securityLevel:strict 约束，不再走 DOMPurify（会破坏 foreignObject 节点标签） */
export function sanitizeMermaidSvg(html: string): string {
  const trimmed = html.trim()
  if (!trimmed.startsWith('<svg')) return html
  return trimmed
}

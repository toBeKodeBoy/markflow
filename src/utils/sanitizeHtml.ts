import DOMPurify from 'dompurify'

/** 与分屏预览一致的 HTML 清洗策略，供 WYSIWYG 内联/块级 HTML 渲染复用 */
export function sanitizeRenderedHtml(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}

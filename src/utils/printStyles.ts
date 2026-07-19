import type { PdfExportOptions } from '../types'
import { getMarginCss, normalizePdfOptions } from './pdfOptions'

/**
 * PDF / 打印专用样式：对齐预览 .markdown-body 语义，固定浅色纸张主题。
 * 自包含，不依赖应用运行时 CSS 变量。
 */
export function buildPrintStyles(options?: Partial<PdfExportOptions>): string {
  const opts = normalizePdfOptions(options)
  const margin = getMarginCss(opts.margin)
  const pageSize = opts.landscape === 'landscape' ? `${opts.pageSize} landscape` : opts.pageSize
  const noBg = !opts.printBackground
    ? `
pre, code, blockquote, th, tr:nth-child(even), mark.highlight-mark,
.markdown-body :not(pre) > code {
  background: transparent !important;
}
`
    : ''

  return `
@page {
  size: ${pageSize};
  margin: ${margin};
}
${noBg}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: #fff;
}

body.print-root,
.markdown-body {
  font: 14px/1.7 "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Segoe UI", sans-serif;
  color: #1f2937;
  max-width: 100%;
  word-wrap: break-word;
  overflow-wrap: break-word;
  orphans: 3;
  widows: 3;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
  line-height: 1.3;
  color: #111827;
  break-after: avoid;
  page-break-after: avoid;
}

.markdown-body h1 {
  font-size: 2em;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 0.3em;
}

.markdown-body h2 {
  font-size: 1.5em;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.2em;
}

.markdown-body h3 { font-size: 1.25em; }
.markdown-body h4 { font-size: 1.1em; }

.markdown-body p { margin: 0.8em 0; }

.markdown-body a {
  color: #4f46e5;
  text-decoration: underline;
}

.markdown-body :not(pre) > code {
  display: inline;
  vertical-align: baseline;
  white-space: nowrap;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: "JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace;
  font-size: 0.88em;
  color: #e06c75;
}

.markdown-body .code-block-wrapper {
  position: relative;
  margin: 1em 0;
}

.markdown-body pre {
  background: #f1f5f9;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px 16px;
  overflow-x: auto;
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  break-inside: auto;
  page-break-inside: auto;
}

.markdown-body pre code {
  display: block;
  white-space: pre-wrap;
  background: none;
  padding: 0;
  color: #1f2937;
  font-family: "JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace;
  font-size: 13px;
  overflow-wrap: anywhere;
}

/* 打印隐藏交互控件 */
.image-scale-badge,
.image-scale-actions,
.code-copy-btn,
.code-block-actions {
  display: none !important;
}

.markdown-body blockquote {
  border-left: 4px solid #6366f1;
  margin: 1em 0;
  padding: 8px 16px;
  background: #f8fafc;
  border-radius: 0 6px 6px 0;
  color: #6b7280;
  break-inside: avoid-page;
}

.markdown-body ul,
.markdown-body ol {
  margin: 0.8em 0;
  padding-left: 1.8em;
}

.markdown-body li { margin: 0.3em 0; }

.markdown-body ul.contains-task-list {
  padding-left: 1.5em;
}

.markdown-body li.task-list-item {
  list-style-type: none;
}

.markdown-body li.task-list-item + li.task-list-item {
  margin-top: 0.25em;
}

.markdown-body .task-list-item-checkbox {
  margin: 0 0.35em 0.1em -1.4em;
  vertical-align: middle;
}

.markdown-body table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 13px;
  break-inside: auto;
  page-break-inside: auto;
}

.markdown-body thead {
  display: table-header-group;
}

.markdown-body tfoot {
  display: table-footer-group;
}

.markdown-body tr,
.markdown-body th,
.markdown-body td {
  break-inside: avoid-page;
}

.markdown-body th,
.markdown-body td {
  border: 1px solid #e5e7eb;
  padding: 8px 12px;
  text-align: left;
}

.markdown-body th {
  background: #f3f4f6;
  font-weight: 600;
}

.markdown-body tr:nth-child(even) { background: #f9fafb; }

.markdown-body hr {
  border: none;
  border-top: 2px solid #e5e7eb;
  margin: 1.5em 0;
}

.markdown-body img,
.markflow-image-frame img {
  width: 100%;
  max-width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
  border-radius: 6px;
  cursor: default;
}

.markflow-image-wrapper {
  margin: 0.8em 0;
  text-align: center;
}

.markflow-image-frame {
  position: relative;
  display: inline-block;
  max-width: 100%;
  vertical-align: top;
  break-inside: avoid;
  page-break-inside: avoid;
}

.markflow-img-scale-10 { width: 10%; }
.markflow-img-scale-30 { width: 30%; }
.markflow-img-scale-50 { width: 50%; }
.markflow-img-scale-100 { width: 100%; }

.markdown-body u {
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: #9ca3af;
}

.markdown-body mark.highlight-mark {
  background: #fff3a3;
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
}

.markdown-body .math-block,
.markdown-body .katex-display,
.markdown-body .mermaid-diagram-wrapper,
.markdown-body .mermaid-rendered,
.markdown-body .markflow-image-wrapper {
  break-inside: avoid-page;
  page-break-inside: avoid;
}

.markdown-body .mermaid-rendered svg {
  display: block;
  max-width: 100%;
  height: auto;
}

/* highlight.js 浅色 token（与预览常见配色接近） */
.hljs-comment,
.hljs-quote { color: #6a737d; font-style: italic; }
.hljs-keyword,
.hljs-selector-tag,
.hljs-addition { color: #d73a49; }
.hljs-number,
.hljs-string,
.hljs-meta .hljs-meta-string,
.hljs-literal,
.hljs-doctag,
.hljs-regexp { color: #032f62; }
.hljs-title,
.hljs-section,
.hljs-name,
.hljs-selector-id,
.hljs-selector-class { color: #6f42c1; }
.hljs-attribute,
.hljs-attr,
.hljs-variable,
.hljs-template-variable,
.hljs-class .hljs-title,
.hljs-type { color: #005cc5; }
.hljs-symbol,
.hljs-bullet,
.hljs-link { color: #e36209; }
.hljs-built_in,
.hljs-builtin-name { color: #005cc5; }
.hljs-meta { color: #6a737d; }
.hljs-deletion { color: #b31d28; background: #ffeef0; }
.hljs-addition { background: #f0fff4; }
`.trim()
}

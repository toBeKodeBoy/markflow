import { marked, type TokenizerAndRendererExtension, type RendererExtension } from 'marked'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'
import { escapeHtml } from './escapeHtml'
import { COPY_TEXT } from './codeCopy'
import { renderImageHtml } from './imageScale'
import { HeadingSlugger } from './headingSlug'

const headingSlugger = new HeadingSlugger()

/** 去掉 \<u> / \</u> 等转义，避免 marked 输出字面量标签 */
export function normalizeUnderlineMarkdown(md: string): string {
  return md
    .replace(/\\{1,2}<(u(?:\s[^>]*)?)>/gi, '<$1>')
    .replace(/\\{1,2}<\/u>/gi, '</u>')
}

/** marked 内联扩展：支持 ==高亮== 语法 */
const highlightMarkExtension: TokenizerAndRendererExtension = {
  name: 'highlightMark',
  level: 'inline',
  start(src) {
    const idx = src.indexOf('==')
    return idx >= 0 ? idx : undefined
  },
  tokenizer(src) {
    const match = /^==([^=\n]+?)==/.exec(src)
    if (!match) return undefined
    return {
      type: 'highlightMark',
      raw: match[0],
      text: match[1],
      tokens: this.lexer.inlineTokens(match[1]),
    }
  },
  renderer(token) {
    const inner = this.parser.parseInline(token.tokens ?? [])
    return `<mark class="highlight-mark">${inner}</mark>`
  },
}

/** marked 内联扩展：显式解析 <u>...</u>（优先于转义后的纯文本） */
const underlineHtmlExtension: TokenizerAndRendererExtension = {
  name: 'underlineHtml',
  level: 'inline',
  start(src) {
    const idx = src.search(/<?\\?<u\b/i)
    return idx >= 0 ? idx : undefined
  },
  tokenizer(src) {
    const match = /^\\?<u>([^<\n]+?)\\?<\/u>/i.exec(src)
    if (!match) return undefined
    return {
      type: 'underlineHtml',
      raw: match[0],
      text: match[1],
      tokens: this.lexer.inlineTokens(match[1]),
    }
  },
  renderer(token) {
    const inner = this.parser.parseInline(token.tokens ?? [])
    return `<u>${inner}</u>`
  },
}

/** 图片渲染：等比例缩放 + 居中完整显示 */
const imageRenderer: RendererExtension = {
  name: 'image',
  renderer(token) {
    const href = token.href ?? ''
    const alt = token.text ?? ''
    const title = token.title ?? null
    return renderImageHtml(href, alt, title)
  },
}

/** 页内锚点 href 解码，与 heading id 保持一致（marked 默认会 percent-encode） */
function normalizeFragmentHref(href: string): string {
  if (!href.startsWith('#')) return escapeHtml(href)
  try {
    return `#${decodeURIComponent(href.slice(1))}`
  } catch {
    return escapeHtml(href)
  }
}

/** 链接渲染：页内锚点保持未编码，便于 PDF 内跳转 */
const linkRenderer: RendererExtension = {
  name: 'link',
  renderer(token) {
    const href = normalizeFragmentHref(token.href ?? '')
    const text = this.parser.parseInline(token.tokens ?? [])
    const title = token.title ? ` title="${escapeHtml(token.title)}"` : ''
    return `<a href="${href}"${title}>${text}</a>`
  },
}

/** 标题渲染：注入 id，供 PDF / 预览内锚点跳转 */
const headingRenderer: RendererExtension = {
  name: 'heading',
  renderer(token) {
    const text = this.parser.parseInline(token.tokens ?? [])
    const id = headingSlugger.slug(token.text)
    return `<h${token.depth} id="${escapeHtml(id)}">${text}</h${token.depth}>\n`
  },
}

/** 代码块渲染扩展：语法高亮 + 右上角语言标签 */
const codeBlockRenderer: RendererExtension = {
  name: 'code',
  renderer(token) {
    const code = token.text
    const lang = token.lang || ''
    const langLabel = lang ? `<span class="code-lang-label">${escapeHtml(lang)}</span>` : ''

    let highlighted: string
    if (lang && hljs.getLanguage(lang)) {
      highlighted = hljs.highlight(code, { language: lang }).value
    } else if (lang) {
      highlighted = hljs.highlightAuto(code).value
    } else {
      highlighted = code
    }

    return `<div class="code-block-wrapper">
      <div class="code-block-actions">
        ${langLabel}
        <button class="code-copy-btn">${COPY_TEXT}</button>
      </div>
      <pre><code class="hljs${lang ? ` language-${lang}` : ''}">${highlighted}</code></pre>
    </div>`
  },
}

marked.use({
  extensions: [
    highlightMarkExtension,
    underlineHtmlExtension,
    headingRenderer,
    linkRenderer,
    codeBlockRenderer,
    imageRenderer,
  ],
})

marked.setOptions({
  breaks: true,
  gfm: true,
})

export function parseMarkdown(content: string): string {
  headingSlugger.reset()
  const normalized = normalizeUnderlineMarkdown(content)
  const html = marked.parse(normalized, { async: false })
  const raw = typeof html === 'string' ? html : ''
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
}

export { marked }



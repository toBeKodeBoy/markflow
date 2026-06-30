import { marked, type TokenizerAndRendererExtension, type RendererExtension } from 'marked'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'
import { escapeHtml } from './escapeHtml'

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
        <button class="code-copy-btn">复制</button>
      </div>
      <pre><code class="hljs${lang ? ` language-${lang}` : ''}">${highlighted}</code></pre>
    </div>`
  },
}

marked.use({ extensions: [highlightMarkExtension, underlineHtmlExtension, codeBlockRenderer] })

marked.setOptions({
  breaks: true,
  gfm: true,
})

export function parseMarkdown(content: string): string {
  const normalized = normalizeUnderlineMarkdown(content)
  const html = marked.parse(normalized, { async: false })
  const raw = typeof html === 'string' ? html : ''
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
}

export { marked }



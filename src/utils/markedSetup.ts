import { marked, type Token, type TokenizerAndRendererExtension, type RendererExtension, type Tokens } from 'marked'
import hljs from 'highlight.js'
import { escapeHtml } from './escapeHtml'
import { sanitizeRenderedHtml } from './sanitizeHtml'
import { COPY_TEXT } from './codeCopy'
import { renderImageHtml } from './imageScale'
import { HeadingSlugger } from './headingSlug'
import { renderBlockMath, renderInlineMath } from './mathRender'
import { isMermaidLanguage, renderMermaidBlock } from './mermaidBlock'

const headingSlugger = new HeadingSlugger()

/** 去掉 \<u> / \</u> 等转义，避免 marked 输出字面量标签 */
export function normalizeUnderlineMarkdown(md: string): string {
  return md
    .replace(/\\{1,2}<(u(?:\s[^>]*)?)>/gi, '<$1>')
    .replace(/\\{1,2}<\/u>/gi, '</u>')
}

/** 去掉 \<span> / \</span> 等被 remark-stringify 转义的 HTML 标签 */
export function normalizeHtmlMarkdown(md: string): string {
  return md.replace(/\\<(\/?[a-z][\w-]*(?:\s[^>]*)?)>/gi, '<$1>')
}

import { normalizeBlockMathMarkdown } from './normalizeBlockMath'

/** 编辑器 / 预览解析前统一规范化 */
export function normalizeMarkdownForParse(md: string): string {
  return normalizeBlockMathMarkdown(normalizeHtmlMarkdown(normalizeUnderlineMarkdown(md)))
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

/** 链接渲染：页内锚点保持未编码，便于 PDF / 预览内跳转 */
const linkRenderer: RendererExtension = {
  name: 'link',
  renderer(token) {
    const href = normalizeFragmentHref(token.href ?? '')
    const text = this.parser.parseInline(token.tokens ?? [])
    const title = token.title ? ` title="${escapeHtml(token.title)}"` : ''
    const fragmentClass = href.startsWith('#') ? ' class="md-fragment-link"' : ''
    return `<a href="${href}"${fragmentClass}${title}>${text}</a>`
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

    if (isMermaidLanguage(lang)) {
      return renderMermaidBlock(code)
    }

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

/** 任务项内容：loose list 时 marked 会包一层 paragraph token，直接渲染 inline 避免 <p> */
export function renderListItemContent(
  parse: (tokens: Token[]) => string,
  parseInline: (tokens: Token[]) => string,
  tokens: Token[],
  isTask: boolean,
): string {
  if (!isTask) return parse(tokens)
  if (tokens.length === 1 && tokens[0].type === 'paragraph') {
    return parseInline((tokens[0] as Tokens.Paragraph).tokens ?? [])
  }
  return parse(tokens)
}

/** GFM 任务列表：输出 GitHub 风格 class，loose list 展平 paragraph token */
const taskListRenderer: RendererExtension = {
  name: 'list',
  renderer(token) {
    const body = this.parser.parse(token.items)
    const tag = token.ordered ? 'ol' : 'ul'
    const hasTask = token.items.some((item: Tokens.ListItem) => item.task)
    const cls = hasTask ? ' class="contains-task-list"' : ''
    const start = token.ordered && token.start !== 1 ? ` start="${token.start}"` : ''
    return `<${tag}${cls}${start}>\n${body}</${tag}>\n`
  },
}

const taskListItemRenderer: RendererExtension = {
  name: 'list_item',
  renderer(token) {
    const inner = renderListItemContent(
      (tokens) => this.parser.parse(tokens),
      (tokens) => this.parser.parseInline(tokens),
      token.tokens ?? [],
      Boolean(token.task),
    )
    if (token.task) {
      return `<li class="task-list-item">${inner.trim()}</li>\n`
    }
    return `<li>${inner}</li>\n`
  },
}

const taskCheckboxRenderer: RendererExtension = {
  name: 'checkbox',
  renderer(token) {
    const checked = token.checked ? ' checked=""' : ''
    return `<input class="task-list-item-checkbox" disabled="" type="checkbox"${checked}> `
  },
}

/** 块级公式：$$...$$ */
const mathBlockExtension: TokenizerAndRendererExtension = {
  name: 'mathBlock',
  level: 'block',
  start(src) {
    const idx = src.indexOf('$$')
    return idx >= 0 ? idx : undefined
  },
  tokenizer(src) {
    const match = /^\$\$([\s\S]+?)\$\$/.exec(src)
    if (!match) return undefined
    const text = match[1].trim()
    if (!text) return undefined
    return { type: 'mathBlock', raw: match[0], text }
  },
  renderer(token) {
    return `<div class="math-block">${renderBlockMath(token.text)}</div>\n`
  },
}

/** 行内公式：$...$（跳过货币 $5） */
const mathInlineExtension: TokenizerAndRendererExtension = {
  name: 'mathInline',
  level: 'inline',
  start(src) {
    if (src.startsWith('$$')) return undefined
    const idx = src.indexOf('$')
    return idx >= 0 ? idx : undefined
  },
  tokenizer(src) {
    if (src.startsWith('$$')) return undefined
    const match = /^\$([^$\n]+?)\$/.exec(src)
    if (!match) return undefined
    if (/^\d/.test(match[1])) return undefined
    return { type: 'mathInline', raw: match[0], text: match[1] }
  },
  renderer(token) {
    return renderInlineMath(token.text)
  },
}

marked.use({
  extensions: [
    mathBlockExtension,
    mathInlineExtension,
    highlightMarkExtension,
    underlineHtmlExtension,
    headingRenderer,
    linkRenderer,
    codeBlockRenderer,
    imageRenderer,
    taskListRenderer,
    taskListItemRenderer,
    taskCheckboxRenderer,
  ],
})

marked.setOptions({
  breaks: true,
  gfm: true,
})

export function parseMarkdown(content: string): string {
  headingSlugger.reset()
  const normalized = normalizeMarkdownForParse(content)
  const html = marked.parse(normalized, { async: false })
  const raw = typeof html === 'string' ? html : ''
  return sanitizeRenderedHtml(raw)
}

export { marked }



import { marked, type TokenizerAndRendererExtension } from 'marked'

import hljs from 'highlight.js'



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



marked.use({ extensions: [highlightMarkExtension, underlineHtmlExtension] })



marked.setOptions({

  // @ts-ignore marked 类型未包含 highlight 选项

  highlight: (code: string, lang: string) => {

    if (lang && hljs.getLanguage(lang)) {

      return hljs.highlight(code, { language: lang }).value

    }

    return hljs.highlightAuto(code).value

  },

  breaks: true,

  gfm: true,

} as Parameters<typeof marked.setOptions>[0])



export function parseMarkdown(content: string): string {

  const normalized = normalizeUnderlineMarkdown(content)

  const html = marked.parse(normalized, { async: false })

  return typeof html === 'string' ? html : ''

}



export { marked }



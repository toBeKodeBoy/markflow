import type { MilkdownPlugin } from '@milkdown/ctx'
import { schemaCtx } from '@milkdown/core'
import type { Node as ProseNode } from '@milkdown/prose/model'
import { nodeRule } from '@milkdown/prose'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import type { NodeView } from '@milkdown/prose/view'
import { $inputRule, $nodeAttr, $nodeSchema, $prose, $remark } from '@milkdown/utils'
import { visit } from 'unist-util-visit'
import { sanitizeRenderedHtml } from '../utils/sanitizeHtml'

interface MdastNode {
  type: string
  value?: string
  url?: string
  children?: MdastNode[]
}

interface MdastParent {
  type: string
  children?: MdastNode[]
}

/** remark-parse 常将内联 HTML 拆成 open + 内容 + close，需合并后再渲染 */
const INLINE_HTML_TAGS = new Set([
  'a', 'abbr', 'b', 'cite', 'code', 'del', 'em', 'i', 'ins', 'kbd', 'mark',
  'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'var',
])

const OPEN_TAG_RE = /^<([a-z][\w-]*)(?:\s[^>]*)?>$/i
const CLOSE_TAG_RE = /^<\/([a-z][\w-]*)>$/i
const FULL_TAG_RE = /^<([a-z][\w-]*)(?:\s[^>]*)?>[\s\S]*<\/\1>$/i
const INLINE_HTML_IN_TEXT_RE = /<([a-z][\w-]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi
const HTML_INLINE_INPUT_RE = /(<([a-z][\w-]*)(?:\s[^>]*)?>[\s\S]*?<\/\2>)$/i
const HTML_BLOCK_INPUT_RE = /^(<([a-z][\w-]*)(?:\s[^>]*)?>[\s\S]*?<\/\2>)$/i

const BLOCK_HTML_TAGS = new Set([
  'article', 'aside', 'details', 'div', 'figure', 'footer', 'header', 'main', 'nav',
  'section', 'table',
])

const INLINE_CONTAINER_TYPES = new Set(['paragraph', 'heading'])

function splitTextToHtmlNodes(text: string): MdastNode[] {
  const result: MdastNode[] = []
  let lastIndex = 0
  INLINE_HTML_IN_TEXT_RE.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = INLINE_HTML_IN_TEXT_RE.exec(text)) !== null) {
    const tag = match[1].toLowerCase()
    if (!INLINE_HTML_TAGS.has(tag)) continue

    if (match.index > lastIndex) {
      result.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    result.push({ type: 'html', value: match[0] })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    result.push({ type: 'text', value: text.slice(lastIndex) })
  }
  return result.length ? result : [{ type: 'text', value: text }]
}

function convertTextInlineHtml(children: MdastNode[]): MdastNode[] {
  const result: MdastNode[] = []

  for (const node of children) {
    if (node.type === 'text' && typeof node.value === 'string' && /<[a-z][\w-]*/i.test(node.value)) {
      const split = splitTextToHtmlNodes(node.value)
      if (split.length > 1 || split[0]?.type === 'html') {
        result.push(...split)
        continue
      }
    }
    if (node.children) {
      node.children = convertTextInlineHtml(node.children)
    }
    result.push(node)
  }

  return result
}

function transformInlineHtml(tree: MdastNode) {
  if (tree.children) {
    tree.children = convertTextInlineHtml(tree.children)
    tree.children = mergeSplitInlineHtml(tree.children)
  }
}

function serializeInlineNodesToHtml(nodes: MdastNode[]): string {
  return nodes.map(serializeInlineNode).join('')
}

function serializeInlineNode(node: MdastNode): string {
  switch (node.type) {
    case 'text':
      return node.value ?? ''
    case 'html':
      return node.value ?? ''
    case 'emphasis':
      return `<em>${serializeInlineNodesToHtml(node.children ?? [])}</em>`
    case 'strong':
      return `<strong>${serializeInlineNodesToHtml(node.children ?? [])}</strong>`
    case 'delete':
      return `<del>${serializeInlineNodesToHtml(node.children ?? [])}</del>`
    case 'inlineCode':
      return `<code>${node.value ?? ''}</code>`
    case 'link':
      return `<a href="${node.url ?? ''}">${serializeInlineNodesToHtml(node.children ?? [])}</a>`
    default:
      return serializeInlineNodesToHtml(node.children ?? [])
  }
}

function mergeSplitInlineHtml(children: MdastNode[]): MdastNode[] {
  const result: MdastNode[] = []
  let i = 0

  while (i < children.length) {
    const node = children[i]

    if (node.type === 'html' && typeof node.value === 'string') {
      const trimmed = node.value.trim()
      if (FULL_TAG_RE.test(trimmed)) {
        result.push({ type: 'html', value: trimmed })
        i++
        continue
      }

      const openMatch = OPEN_TAG_RE.exec(trimmed)
      if (openMatch && INLINE_HTML_TAGS.has(openMatch[1].toLowerCase())) {
        const tag = openMatch[1].toLowerCase()
        const inner: MdastNode[] = []
        let j = i + 1
        let closed = false

        while (j < children.length) {
          const next = children[j]
          if (next.type === 'html' && typeof next.value === 'string') {
            const closeMatch = CLOSE_TAG_RE.exec(next.value.trim())
            if (closeMatch && closeMatch[1].toLowerCase() === tag) {
              closed = true
              break
            }
          }
          inner.push(next)
          j++
        }

        if (closed) {
          const closeValue = children[j].value?.trim() ?? ''
          result.push({
            type: 'html',
            value: `${trimmed}${serializeInlineNodesToHtml(inner)}${closeValue}`,
          })
          i = j + 1
          continue
        }
      }
    }

    if (node.children) {
      node.children = mergeSplitInlineHtml(node.children)
    }
    result.push(node)
    i++
  }

  return result
}

function transformMergedInlineHtml(tree: MdastNode) {
  transformInlineHtml(tree)
}

/** 将纯文本中的内联 HTML 转为 html 节点，并合并 remark-parse 拆开的标签 */
export const mergeInlineHtmlRemark = $remark('mergeInlineHtmlRemark', () => () => (tree) => {
  transformMergedInlineHtml(tree as MdastNode)
})

interface HtmlTextMatch {
  from: number
  to: number
  value: string
  block?: boolean
}

interface TextSegment {
  from: number
  text: string
}

function mapCombinedIndexToPos(parts: TextSegment[], index: number): number | null {
  let cursor = 0
  for (const part of parts) {
    const next = cursor + part.text.length
    if (index >= cursor && index <= next) {
      return part.from + (index - cursor)
    }
    cursor = next
  }
  return null
}

function collectTextSegments(node: ProseNode, pos: number): TextSegment[] {
  const parts: TextSegment[] = []
  node.forEach((child, offset) => {
    if (child.isText && child.text && child.marks.length === 0) {
      parts.push({ from: pos + 1 + offset, text: child.text })
    }
  })
  return parts
}

function findInlineHtmlInContainer(node: ProseNode, pos: number): HtmlTextMatch[] {
  const parts = collectTextSegments(node, pos)
  if (!parts.length) return []

  const combined = parts.map((p) => p.text).join('')
  if (!combined.includes('<')) return []

  const matches: HtmlTextMatch[] = []
  INLINE_HTML_IN_TEXT_RE.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = INLINE_HTML_IN_TEXT_RE.exec(combined)) !== null) {
    const tag = match[1].toLowerCase()
    if (!INLINE_HTML_TAGS.has(tag)) continue

    const start = match.index
    const end = start + match[0].length
    const from = mapCombinedIndexToPos(parts, start)
    const to = mapCombinedIndexToPos(parts, end)
    if (from != null && to != null) {
      matches.push({ from, to, value: match[0] })
    }
  }

  return matches
}

function findBlockHtmlInParagraph(node: ProseNode, pos: number): HtmlTextMatch | null {
  if (node.childCount !== 1) return null
  const only = node.firstChild
  if (!only?.isText || !only.text || only.marks.length > 0) return null

  const trimmed = only.text.trim()
  const blockMatch = HTML_BLOCK_INPUT_RE.exec(trimmed)
  if (!blockMatch) return null

  const tag = blockMatch[2]?.toLowerCase() ?? ''
  if (!BLOCK_HTML_TAGS.has(tag)) return null

  return {
    from: pos + 1,
    to: pos + 1 + node.content.size,
    value: blockMatch[1],
    block: true,
  }
}

function findHtmlTextMatches(doc: ProseNode): HtmlTextMatch[] {
  const matches: HtmlTextMatch[] = []

  doc.descendants((node, pos) => {
    if (INLINE_CONTAINER_TYPES.has(node.type.name)) {
      matches.push(...findInlineHtmlInContainer(node, pos))
      const block = findBlockHtmlInParagraph(node, pos)
      if (block) matches.push(block)
    }
  })

  return matches.sort((a, b) => b.from - a.from)
}

function isAllowedInlineHtml(match: RegExpMatchArray): boolean {
  const tag = match[2]?.toLowerCase() ?? ''
  return INLINE_HTML_TAGS.has(tag)
}

function isAllowedBlockHtml(match: RegExpMatchArray): boolean {
  const tag = match[2]?.toLowerCase() ?? ''
  return BLOCK_HTML_TAGS.has(tag)
}

/** 输入完整内联 HTML 后即时转换（如敲完 </span>） */
export const htmlInlineInputRule = $inputRule((ctx) => {
  const htmlType = ctx.get(schemaCtx).nodes.html!
  return nodeRule(HTML_INLINE_INPUT_RE, htmlType, {
    updateCaptured: (captured) => {
      const m = (captured.fullMatch ?? '').match(HTML_INLINE_INPUT_RE)
      if (!m || !isAllowedInlineHtml(m)) return { fullMatch: undefined }
      return captured
    },
    getAttr: (match) => ({ value: match[1] }),
  })
})

/** 输入完整块级 HTML 后即时转换 */
export const htmlBlockInputRule = $inputRule((ctx) => {
  const htmlBlockType = htmlBlockSchema.type(ctx)
  return nodeRule(HTML_BLOCK_INPUT_RE, htmlBlockType, {
    updateCaptured: (captured) => {
      const m = (captured.fullMatch ?? '').match(HTML_BLOCK_INPUT_RE)
      if (!m || !isAllowedBlockHtml(m)) return { fullMatch: undefined }
      return captured
    },
    getAttr: (match) => ({ value: match[1] }),
  })
})

/** 输入纯文本 HTML 时自动转为 html 节点，避免序列化时被 remark-stringify 加反斜杠 */
const HTML_AUTO_CONVERT_KEY = new PluginKey('MARKFLOW_HTML_AUTO_CONVERT')

export const htmlAutoConvertPlugin = $prose((ctx) => {
  const schema = ctx.get(schemaCtx)
  const htmlType = schema.nodes.html
  const htmlBlockType = schema.nodes.html_block
  if (!htmlType) {
    return new Plugin({ key: HTML_AUTO_CONVERT_KEY })
  }

  return new Plugin({
    key: HTML_AUTO_CONVERT_KEY,
    appendTransaction(transactions, _oldState, newState) {
      const docChanged = transactions.some((tr) => tr.docChanged)
      const isSelf = transactions.some((tr) => tr.getMeta(HTML_AUTO_CONVERT_KEY))
      if (!docChanged || isSelf) return null

      const found = findHtmlTextMatches(newState.doc)
      if (!found.length) return null

      const tr = newState.tr
      tr.setMeta(HTML_AUTO_CONVERT_KEY, true)

      for (const item of found) {
        if (item.block && htmlBlockType) {
          const $from = tr.doc.resolve(item.from)
          const para = $from.parent
          const paraPos = $from.before()
          tr.replaceWith(paraPos, paraPos + para.nodeSize, htmlBlockType.create({ value: item.value }))
          continue
        }
        tr.replaceWith(item.from, item.to, htmlType.create({ value: item.value }))
      }
      return tr
    },
  })
})

function renderSanitizedHtml(el: HTMLElement, raw: string) {
  el.innerHTML = sanitizeRenderedHtml(raw)
}

/** 内联 HTML：Milkdown 默认以纯文本展示，改为实际渲染 */
class HtmlInlineNodeView implements NodeView {
  dom: HTMLSpanElement

  constructor(node: ProseNode) {
    this.dom = document.createElement('span')
    this.dom.className = 'markflow-html-inline'
    this.dom.contentEditable = 'false'
    renderSanitizedHtml(this.dom, node.attrs.value ?? '')
  }

  update(node: ProseNode): boolean {
    if (node.type.name !== 'html') return false
    renderSanitizedHtml(this.dom, node.attrs.value ?? '')
    return true
  }

  ignoreMutation(): boolean {
    return true
  }

  stopEvent(): boolean {
    return true
  }
}

/** 块级 HTML：根级标签（如 div、table）需独立 block 节点承载 */
class HtmlBlockNodeView implements NodeView {
  dom: HTMLDivElement

  constructor(node: ProseNode) {
    this.dom = document.createElement('div')
    this.dom.className = 'markflow-html-block'
    this.dom.contentEditable = 'false'
    renderSanitizedHtml(this.dom, node.attrs.value ?? '')
  }

  update(node: ProseNode): boolean {
    if (node.type.name !== 'html_block') return false
    renderSanitizedHtml(this.dom, node.attrs.value ?? '')
    return true
  }

  ignoreMutation(): boolean {
    return true
  }

  stopEvent(): boolean {
    return true
  }
}

/** 将根级 mdast html 节点标记为 htmlBlock，供块级 schema 解析 */
export const htmlBlockRemark = $remark('htmlBlockRemark', () => () => (tree) => {
  visit(tree, 'html', (node, _index, parent) => {
    const p = parent as MdastParent | undefined
    if (p?.type === 'root') {
      ;(node as { type: string }).type = 'htmlBlock'
    }
  })
})

export const htmlBlockAttr = $nodeAttr('html_block')

export const htmlBlockSchema = $nodeSchema('html_block', (ctx) => ({
  atom: true,
  group: 'block',
  attrs: {
    value: {
      default: '',
      validate: 'string',
    },
  },
  toDOM: (node) => ['div', { ...ctx.get(htmlBlockAttr.key)(node), 'data-type': 'html-block' }],
  parseDOM: [
    {
      tag: 'div[data-type="html-block"]',
      getAttrs: (dom) => ({
        value: (dom as HTMLElement).dataset.value ?? '',
      }),
    },
  ],
  parseMarkdown: {
    match: (node) => node.type === 'htmlBlock',
    runner: (state, node, type) => {
      state.addNode(type, { value: node.value as string })
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'html_block',
    runner: (state, node) => {
      state.addNode('html', undefined, node.attrs.value)
    },
  },
}))

export const htmlRenderPlugin = $prose(() => {
  return new Plugin({
    key: new PluginKey('MARKFLOW_HTML_RENDER'),
    props: {
      nodeViews: {
        html: (node) => new HtmlInlineNodeView(node),
        html_block: (node) => new HtmlBlockNodeView(node),
      },
    },
  })
})

export const htmlRenderPlugins: MilkdownPlugin[] = [
  mergeInlineHtmlRemark,
  htmlBlockRemark,
  htmlBlockAttr,
  htmlBlockSchema,
  htmlInlineInputRule,
  htmlBlockInputRule,
  htmlRenderPlugin,
  htmlAutoConvertPlugin,
].flat()

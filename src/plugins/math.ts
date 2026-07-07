import type { MilkdownPlugin } from '@milkdown/ctx'
import { schemaCtx } from '@milkdown/core'
import type { RemarkPluginRaw } from '@milkdown/transformer'
import type { Node as ProseNode } from '@milkdown/prose/model'
import { Fragment } from '@milkdown/prose/model'
import { nodeRule } from '@milkdown/prose'
import { InputRule } from '@milkdown/prose/inputrules'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import type { NodeView } from '@milkdown/prose/view'
import { $inputRule, $nodeSchema, $prose, $remark } from '@milkdown/utils'
import katex from 'katex'
import remarkMath from 'remark-math'
import { isCurrencyLikeMath } from '../utils/normalizeBlockMath'

export const mathRemark = $remark('mathRemark', () => remarkMath as RemarkPluginRaw<unknown>)

const INLINE_MATH_TEXT_RE = /\$(?!\$)([^$\n]+?)\$(?!\$)/g
const BLOCK_MATH_TEXT_RE = /^\$\$([\s\S]+?)\$\$$/

function renderKatex(el: HTMLElement, latex: string, displayMode: boolean) {
  el.innerHTML = ''
  try {
    katex.render(latex, el, { displayMode, throwOnError: false })
  } catch {
    el.textContent = displayMode ? latex : `$${latex}$`
  }
}

class MathInlineNodeView implements NodeView {
  dom: HTMLSpanElement

  constructor(node: ProseNode) {
    this.dom = document.createElement('span')
    this.dom.className = 'math-inline markflow-math-inline'
    this.dom.contentEditable = 'false'
    renderKatex(this.dom, node.attrs.value ?? '', false)
  }

  update(node: ProseNode): boolean {
    if (node.type.name !== 'math_inline') return false
    renderKatex(this.dom, node.attrs.value ?? '', false)
    return true
  }

  ignoreMutation(): boolean {
    return true
  }

  stopEvent(): boolean {
    return true
  }
}

class MathBlockNodeView implements NodeView {
  dom: HTMLDivElement

  constructor(node: ProseNode) {
    this.dom = document.createElement('div')
    this.dom.className = 'math-block markflow-math-block'
    this.dom.contentEditable = 'false'
    renderKatex(this.dom, node.attrs.value ?? '', true)
  }

  update(node: ProseNode): boolean {
    if (node.type.name !== 'math_block') return false
    renderKatex(this.dom, node.attrs.value ?? '', true)
    return true
  }

  ignoreMutation(): boolean {
    return true
  }

  stopEvent(): boolean {
    return true
  }
}

export const mathInlineSchema = $nodeSchema('math_inline', () => ({
  group: 'inline',
  inline: true,
  atom: true,
  attrs: {
    value: {
      default: '',
      validate: 'string',
    },
  },
  toDOM: (node) => ['span', { class: 'math-inline', 'data-value': node.attrs.value }],
  parseDOM: [
    {
      tag: 'span.math-inline',
      getAttrs: (dom) => ({
        value: (dom as HTMLElement).dataset.value ?? '',
      }),
    },
  ],
  parseMarkdown: {
    match: (node) => node.type === 'inlineMath',
    runner: (state, node, type) => {
      state.addNode(type, { value: (node as { value?: string }).value ?? '' })
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'math_inline',
    runner: (state, node) => {
      state.addNode('inlineMath', undefined, node.attrs.value)
    },
  },
}))

export const mathBlockSchema = $nodeSchema('math_block', () => ({
  group: 'block',
  atom: true,
  attrs: {
    value: {
      default: '',
      validate: 'string',
    },
  },
  toDOM: (node) => ['div', { class: 'math-block', 'data-value': node.attrs.value }],
  parseDOM: [
    {
      tag: 'div.math-block',
      getAttrs: (dom) => ({
        value: (dom as HTMLElement).dataset.value ?? '',
      }),
    },
  ],
  parseMarkdown: {
    match: (node) => node.type === 'math',
    runner: (state, node, type) => {
      state.addNode(type, { value: (node as { value?: string }).value ?? '' })
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'math_block',
    runner: (state, node) => {
      state.addNode('math', undefined, node.attrs.value)
    },
  },
}))

/** 块级公式优先：避免 $$...$$ 被行内规则误匹配 */
export const mathBlockInputRule = $inputRule((ctx) => {
  const mathBlockType = mathBlockSchema.type(ctx)
  return nodeRule(/\$\$([^$\n]+?)\$\$$/, mathBlockType, {
    getAttr: (match) => ({ value: match[1].trim() }),
  })
})

export const mathInlineInputRule = $inputRule((ctx) => {
  const mathType = mathInlineSchema.type(ctx)
  return new InputRule(/\$([^$\n]+?)\$$/, (state, match, start, end) => {
    const content = match[1]
    if (!content || isCurrencyLikeMath(content)) return null
    if (isInsideCodeContext(state.doc, start)) return null
    const node = mathType.create({ value: content })
    if (!node) return null
    return state.tr.replaceWith(start, end, node)
  })
})

function hasCodeMark(node: ProseNode): boolean {
  return node.marks.some((m) => m.type.name === 'code')
}

function isInsideCodeContext(doc: ProseNode, pos: number): boolean {
  const $pos = doc.resolve(pos)
  if ($pos.parent.type.spec.code) return true
  return $pos.marks().some((m) => m.type.name === 'code')
}

interface MathAutoConvertMatch {
  from: number
  to: number
  block?: boolean
  value: string
}

function findMathAutoConvertMatches(doc: ProseNode): MathAutoConvertMatch[] {
  const matches: MathAutoConvertMatch[] = []

  doc.descendants((node, pos) => {
    if (node.type.name === 'paragraph' && node.childCount === 1) {
      const only = node.firstChild
      if (only?.isText && only.text) {
        const block = BLOCK_MATH_TEXT_RE.exec(only.text.trim())
        if (block) {
          matches.push({
            from: pos,
            to: pos + node.nodeSize,
            block: true,
            value: block[1].trim(),
          })
          return
        }
      }
    }

    if (!node.isText || !node.text) return
    if (hasCodeMark(node)) return
    const $pos = doc.resolve(pos)
    if ($pos.parent.type.spec.code) return

    INLINE_MATH_TEXT_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = INLINE_MATH_TEXT_RE.exec(node.text)) !== null) {
      if (isCurrencyLikeMath(match[1])) continue
      matches.push({
        from: pos + match.index,
        to: pos + match.index + match[0].length,
        value: match[1],
      })
    }
  })

  return matches.sort((a, b) => b.from - a.from)
}

const MATH_AUTO_CONVERT_KEY = new PluginKey('MARKFLOW_MATH_AUTO_CONVERT')

export const mathAutoConvertPlugin = $prose((ctx) => {
  const schema = ctx.get(schemaCtx)
  const mathInlineType = mathInlineSchema.type(ctx)
  const mathBlockType = mathBlockSchema.type(ctx)

  return new Plugin({
    key: MATH_AUTO_CONVERT_KEY,
    appendTransaction(transactions, _oldState, newState) {
      const docChanged = transactions.some((tr) => tr.docChanged)
      const isSelf = transactions.some((tr) => tr.getMeta(MATH_AUTO_CONVERT_KEY))
      if (!docChanged || isSelf) return null

      const found = findMathAutoConvertMatches(newState.doc)
      if (!found.length) return null

      const tr = newState.tr
      tr.setMeta(MATH_AUTO_CONVERT_KEY, true)

      for (const item of found) {
        if (item.block) {
          tr.replaceWith(item.from, item.to, mathBlockType.create({ value: item.value }))
          continue
        }

        const $from = tr.doc.resolve(item.from)
        const parent = $from.parent
        const parentPos = $from.before()
        const textNode = parent.childAfter($from.parentOffset)
        if (!textNode.node?.isText || textNode.node.text == null) continue

        const text = textNode.node.text
        const localStart = item.from - (parentPos + 1 + textNode.offset)
        const localEnd = item.to - (parentPos + 1 + textNode.offset)
        const before = text.slice(0, localStart)
        const after = text.slice(localEnd)

        const parts: ProseNode[] = []
        if (before) parts.push(schema.text(before))
        parts.push(mathInlineType.create({ value: item.value }))
        if (after) parts.push(schema.text(after))

        tr.replaceWith(
          parentPos + 1 + textNode.offset,
          parentPos + 1 + textNode.offset + textNode.node.nodeSize,
          parts.length === 1 ? parts[0] : Fragment.from(parts),
        )
      }

      return tr
    },
  })
})

export const mathRenderPlugin = $prose(() => {
  return new Plugin({
    key: new PluginKey('MARKFLOW_MATH_RENDER'),
    props: {
      nodeViews: {
        math_inline: (node) => new MathInlineNodeView(node),
        math_block: (node) => new MathBlockNodeView(node),
      },
    },
  })
})

export const mathPlugins: MilkdownPlugin[] = [
  mathRemark,
  mathInlineSchema,
  mathBlockSchema,
  mathBlockInputRule,
  mathInlineInputRule,
  mathAutoConvertPlugin,
  mathRenderPlugin,
].flat()

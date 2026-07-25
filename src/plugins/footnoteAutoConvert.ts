import type { MilkdownPlugin } from '@milkdown/ctx'
import { schemaCtx } from '@milkdown/core'
import type { Node as ProseNode, Schema } from '@milkdown/prose/model'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { $prose } from '@milkdown/utils'

const FOOTNOTE_REF_IN_TEXT_RE = /\[\^([^\]\s]+)\]/g
const FOOTNOTE_DEF_LINE_RE = /^\[\^([^\]\s]+)\]:[ \t]*(.*)$/

export interface FootnoteRefTextMatch {
  from: number
  to: number
  label: string
}

export interface FootnoteDefTextMatch {
  from: number
  to: number
  label: string
  content: string
}

function isCodeContext($pos: ReturnType<ProseNode['resolve']>): boolean {
  for (let depth = $pos.depth; depth >= 0; depth -= 1) {
    if ($pos.node(depth).type.spec.code) return true
  }
  return false
}

/** 在普通文本中查找尚未转为节点的脚注引用 `[^id]` */
export function findFootnoteRefTextMatches(doc: ProseNode): FootnoteRefTextMatch[] {
  const matches: FootnoteRefTextMatch[] = []

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    if (node.type.name === 'footnote_reference') return

    const $pos = doc.resolve(pos)
    if (isCodeContext($pos)) return
    if ($pos.parent.type.name === 'footnote_definition') return

    FOOTNOTE_REF_IN_TEXT_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = FOOTNOTE_REF_IN_TEXT_RE.exec(node.text)) !== null) {
      matches.push({
        from: pos + match.index,
        to: pos + match.index + match[0].length,
        label: match[1],
      })
    }
  })

  return matches.sort((a, b) => b.from - a.from)
}

/** 查找整段为 `[^id]: content` 的段落，转为 footnote_definition */
export function findFootnoteDefTextMatches(doc: ProseNode): FootnoteDefTextMatch[] {
  const matches: FootnoteDefTextMatch[] = []

  doc.forEach((node, offset) => {
    if (node.type.name !== 'paragraph') return
    const text = node.textContent
    const match = FOOTNOTE_DEF_LINE_RE.exec(text)
    if (!match) return
    // 仅当段落纯文本结构可整段替换时转换（避免破坏已有复杂 mark 结构的误伤可接受）
    if (node.content.size === 0) return

    matches.push({
      from: offset,
      to: offset + node.nodeSize,
      label: match[1],
      content: match[2] ?? '',
    })
  })

  return matches.sort((a, b) => b.from - a.from)
}

function convertFootnoteTexts(schema: Schema, doc: ProseNode) {
  const refType = schema.nodes.footnote_reference
  const defType = schema.nodes.footnote_definition
  const paragraphType = schema.nodes.paragraph
  if (!refType || !defType || !paragraphType) return null

  const defMatches = findFootnoteDefTextMatches(doc)
  const refMatches = findFootnoteRefTextMatches(doc)
  if (!defMatches.length && !refMatches.length) return null

  return { defMatches, refMatches, refType, defType, paragraphType }
}

/**
 * 将键入的 `[^id]` / `[^id]: …` 纯文本即时转为 GFM 脚注节点，
 * 避免序列化为 `\[^id]` 导致预览把 HTML 当字面量。
 */
export const footnoteAutoConvertPlugin = $prose((ctx) => {
  const schema = ctx.get(schemaCtx)

  return new Plugin({
    key: new PluginKey('MARKFLOW_FOOTNOTE_AUTO_CONVERT'),
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some((tr) => tr.docChanged)) return null

      const found = convertFootnoteTexts(schema, newState.doc)
      if (!found) return null

      const { defMatches, refMatches, refType, defType, paragraphType } = found
      const tr = newState.tr

      for (const item of defMatches) {
        const inner = item.content
          ? paragraphType.create(null, schema.text(item.content))
          : paragraphType.create()
        const defNode = defType.create({ label: item.label }, inner)
        tr.replaceWith(item.from, item.to, defNode)
      }

      // 定义替换后文档位置会变；若同一次既有定义又有引用，先处理定义再基于最新 doc 找引用
      if (defMatches.length && refMatches.length) {
        const mappedDoc = tr.doc
        const remainingRefs = findFootnoteRefTextMatches(mappedDoc)
        for (const item of remainingRefs) {
          tr.replaceWith(item.from, item.to, refType.create({ label: item.label }))
        }
      } else {
        for (const item of refMatches) {
          tr.replaceWith(item.from, item.to, refType.create({ label: item.label }))
        }
      }

      return tr.docChanged ? tr : null
    },
  })
})

export const footnoteAutoConvertPlugins: MilkdownPlugin[] = [footnoteAutoConvertPlugin]

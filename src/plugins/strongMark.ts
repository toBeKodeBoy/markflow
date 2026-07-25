import type { MilkdownPlugin } from '@milkdown/ctx'
import { schemaCtx } from '@milkdown/core'
import type { Node as ProseNode } from '@milkdown/prose/model'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { $prose } from '@milkdown/utils'

interface StrongMatch {
  from: number
  to: number
  text: string
}

const STRONG_TEXT_RE = /(?<![\w:/])\*\*([^*\n]+?)\*\*(?![\w/])/g
const INLINE_CODE_TEXT_RE = /`([^`\n]+?)`/g

interface TextRange {
  from: number
  to: number
}

function collectInlineCodeLiteralRanges(text: string): TextRange[] {
  const ranges: TextRange[] = []

  INLINE_CODE_TEXT_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = INLINE_CODE_TEXT_RE.exec(text)) !== null) {
    ranges.push({
      from: match.index,
      to: match.index + match[0].length,
    })
  }

  return ranges
}

function isInsideTextRanges(from: number, to: number, ranges: TextRange[]): boolean {
  return ranges.some((range) => from >= range.from && to <= range.to)
}

function findPlainStrongMatches(doc: ProseNode): StrongMatch[] {
  const matches: StrongMatch[] = []

  doc.descendants((node: ProseNode, pos: number) => {
    if (!node.isText || !node.text) return

    const $pos = doc.resolve(pos)
    if ($pos.parent.type.spec.code) return
    if (node.marks.some((mark) => mark.type.name === 'strong' || mark.type.name === 'inlineCode')) return

    const inlineCodeLiteralRanges = collectInlineCodeLiteralRanges(node.text)
    STRONG_TEXT_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = STRONG_TEXT_RE.exec(node.text)) !== null) {
      const matchFrom = match.index
      const matchTo = match.index + match[0].length
      if (isInsideTextRanges(matchFrom, matchTo, inlineCodeLiteralRanges)) continue

      matches.push({
        from: pos + matchFrom,
        to: pos + matchTo,
        text: match[1],
      })
    }
  })

  return matches.sort((a, b) => b.from - a.from)
}

/** 将编辑态中已闭合的 `**text**` 即时转为 strong mark，避免字面量标记直接展示 */
export const strongAutoConvertPlugin = $prose((ctx) => {
  const schema = ctx.get(schemaCtx)

  return new Plugin({
    key: new PluginKey('strongAutoConvert'),
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some((tr) => tr.docChanged)) return null

      const strongType = schema.marks.strong
      if (!strongType) return null

      const found = findPlainStrongMatches(newState.doc)
      if (!found.length) return null

      const tr = newState.tr
      for (const item of found) {
        tr.replaceWith(
          item.from,
          item.to,
          schema.text(item.text, [strongType.create()]),
        )
      }
      return tr
    },
  })
})

export const strongMarkPlugins: MilkdownPlugin[] = [
  strongAutoConvertPlugin,
].flat()

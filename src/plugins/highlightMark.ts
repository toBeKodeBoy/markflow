import type { MilkdownPlugin } from '@milkdown/ctx'
import type { RemarkPluginRaw } from '@milkdown/transformer'
import { markRule } from '@milkdown/prose'
import { $inputRule, $markAttr, $markSchema, $remark } from '@milkdown/utils'
import { remarkHighlightMark } from 'remark-highlight-mark'

export const highlightMarkRemark = $remark('highlightMarkRemark', () =>
  remarkHighlightMark as RemarkPluginRaw<unknown>
)

export const highlightMarkAttr = $markAttr('highlight')

export const highlightMarkSchema = $markSchema('highlight', (ctx) => ({
  parseDOM: [{ tag: 'mark.highlight-mark' }],
  toDOM: (mark) => ['mark', { class: 'highlight-mark', ...ctx.get(highlightMarkAttr.key)(mark) }],
  parseMarkdown: {
    match: (node) => node.type === 'highlight',
    runner: (state, node, markType) => {
      state.openMark(markType)
      state.next(node.children)
      state.closeMark(markType)
    },
  },
  toMarkdown: {
    match: (mark) => mark.type.name === 'highlight',
    runner: (state, mark) => {
      state.withMark(mark, 'highlight')
    },
  },
}))

export const highlightMarkInputRule = $inputRule((ctx) => {
  return markRule(/==([^=\n]+?)==$/, highlightMarkSchema.type(ctx))
})

/** Milkdown 插件集合：remark 解析 + schema + 输入规则 */
export const highlightMarkPlugins: MilkdownPlugin[] = [
  highlightMarkRemark,
  highlightMarkAttr,
  highlightMarkSchema,
  highlightMarkInputRule,
].flat()

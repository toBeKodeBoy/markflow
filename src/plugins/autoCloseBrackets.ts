import type { Ctx } from '@milkdown/ctx'
import { $prose } from '@milkdown/utils'
import { Plugin, PluginKey, TextSelection } from '@milkdown/prose/state'
import type { EditorView } from '@milkdown/prose/view'

const PAIRS: Record<string, string> = { '(': ')', '{': '}' }
/** 与 CodeMirror closeBrackets 默认 before 一致 */
const CLOSE_BEFORE = ')]}:;>'

function handleBracketInput(
  view: EditorView,
  from: number,
  to: number,
  text: string,
): boolean {
  const close = PAIRS[text]
  if (!close) return false

  const { state } = view
  const doc = state.doc
  const nextChar = doc.textBetween(to, to + 1)

  if (nextChar === close) {
    view.dispatch(state.tr.setSelection(TextSelection.create(doc, to + 1)))
    return true
  }

  if (from === to) {
    if (nextChar && !/\s/.test(nextChar) && !CLOSE_BEFORE.includes(nextChar)) {
      return false
    }
    const tr = state.tr.insertText(text + close, from, to)
    tr.setSelection(TextSelection.create(tr.doc, from + 1))
    view.dispatch(tr)
    return true
  }

  const selected = doc.textBetween(from, to)
  const tr = state.tr.insertText(text + selected + close, from, to)
  tr.setSelection(TextSelection.create(tr.doc, from + 1, from + 1 + selected.length))
  view.dispatch(tr)
  return true
}

/** WYSIWYG：输入 ( / { 自动补全右括号 */
export const autoCloseBracketsPlugin = $prose((_ctx: Ctx) => {
  return new Plugin({
    key: new PluginKey('MARKFLOW_AUTO_CLOSE_BRACKETS'),
    props: {
      handleTextInput(view, from, to, text) {
        return handleBracketInput(view, from, to, text)
      },
    },
  })
})

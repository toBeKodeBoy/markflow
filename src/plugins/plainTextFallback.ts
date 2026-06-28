import { Plugin, PluginKey } from '@milkdown/prose/state'
import type { EditorView } from '@milkdown/prose/view'
import { $prose } from '@milkdown/utils'

/// 兜底粘贴插件：在所有粘贴处理器之后注册，当 markdownPaste 和 clipboard 均无法处理时，
/// 将剪贴板纯文本直接插入编辑器，确保粘贴操作不会静默失败。
export const plainTextFallback = $prose(() => {
  return new Plugin({
    key: new PluginKey('MARKFLOW_PLAINTEXT_FALLBACK'),
    props: {
      handlePaste(view: EditorView, event: ClipboardEvent) {
        const { clipboardData } = event
        if (!clipboardData) return false

        const editable = view.props.editable
        if (editable && !editable(view.state)) return false

        if (view.state.selection.$from.node().type.spec.code) return false

        const text = clipboardData.getData('text/plain')
        if (!text) return false

        try {
          view.dispatch(view.state.tr.insertText(text.replace(/\r\n?/g, '\n')))
          return true
        } catch {
          return false
        }
      },
    },
  })
})

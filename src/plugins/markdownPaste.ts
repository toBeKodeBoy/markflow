import type { Ctx } from '@milkdown/ctx'
import { parserCtx, schemaCtx } from '@milkdown/core'
import { DOMParser, DOMSerializer } from '@milkdown/prose/model'
import { Plugin, PluginKey, type EditorState } from '@milkdown/prose/state'
import type { EditorView } from '@milkdown/prose/view'
import { $prose } from '@milkdown/utils'

/** 判断纯文本是否像 Markdown 源码（用于在存在 HTML 时仍优先走 Markdown 解析） */
export function looksLikeMarkdown(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  return (
    /^#{1,6}\s/m.test(t) ||
    /\*\*[^*\n]+\*\*/.test(t) ||
    /__[^_\n]+__/.test(t) ||
    /(?<!\*)\*[^*\n]+\*(?!\*)/.test(t) ||
    /^\s*[-*+]\s/m.test(t) ||
    /^\s*\d+\.\s/m.test(t) ||
    /^>\s/m.test(t) ||
    /^[ \t]*`{3,}/m.test(t) ||
    /^[ \t]*~{3,}/m.test(t) ||
    /^\|.+\|/m.test(t) ||
    /!\[[^\]]*\]\([^)]+\)/.test(t) ||
    /\[[^\]]+\]\([^)]+\)/.test(t) ||
    /<u>[^<\n]+<\/u>/i.test(t)
  )
}

function shouldParseAsMarkdown(text: string, html: string, vscodeData: string): boolean {
  if (vscodeData) {
    try {
      if (JSON.parse(vscodeData)?.mode === 'markdown') return true
    } catch {
      /* ignore invalid vscode clipboard payload */
    }
  }
  if (!html) return true
  return looksLikeMarkdown(text)
}

function parseMarkdownSlice(ctx: Ctx, text: string) {
  const parser = ctx.get(parserCtx)
  const schema = ctx.get(schemaCtx)
  const doc = parser(text.replace(/\r\n?/g, '\n'))
  if (!doc || typeof doc === 'string') return null

  const domParser = DOMParser.fromSchema(schema)
  const dom = DOMSerializer.fromSchema(schema).serializeFragment(doc.content)
  return domParser.parseSlice(dom)
}

function isEditable(view: EditorView): boolean {
  const editable = view.props.editable
  return editable ? editable(view.state as EditorState) : true
}

/// 在 clipboard 插件之后注册，优先于默认 HTML/VS Code 代码块粘贴路径解析 Markdown
export const markdownPaste = $prose((ctx) => {
  return new Plugin({
    key: new PluginKey('MARKFLOW_MARKDOWN_PASTE'),
    props: {
      handlePaste(view, event) {
        const { clipboardData } = event
        if (!clipboardData || !isEditable(view)) return false
        if (view.state.selection.$from.node().type.spec.code) return false

        const text = clipboardData.getData('text/plain')
        if (!text) return false

        const html = clipboardData.getData('text/html')
        const vscodeData = clipboardData.getData('vscode-editor-data')
        if (!shouldParseAsMarkdown(text, html, vscodeData)) return false

        const slice = parseMarkdownSlice(ctx, text)
        if (!slice) return false

        try {
          view.dispatch(view.state.tr.replaceSelection(slice))
          return true
        } catch {
          return false
        }
      },
    },
  })
})

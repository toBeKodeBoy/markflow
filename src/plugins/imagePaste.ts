import type { Ctx } from '@milkdown/ctx'
import { parserCtx, schemaCtx } from '@milkdown/core'
import { DOMParser, DOMSerializer } from '@milkdown/prose/model'
import { Plugin, PluginKey, Selection, type EditorState } from '@milkdown/prose/state'
import type { EditorView } from '@milkdown/prose/view'
import { $prose } from '@milkdown/utils'
import { getAssetStorage } from '../composables/useAssetStorage'
import { showAppNotification } from '../utils/notify'

function isEditable(view: EditorView): boolean {
  const editable = view.props.editable
  return editable ? editable(view.state as EditorState) : true
}

function getClipboardImageFile(clipboardData: DataTransfer): File | null {
  const items = clipboardData.items
  if (!items) return null
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      return item.getAsFile()
    }
  }
  return null
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

async function insertImageMarkdown(
  ctx: Ctx,
  view: EditorView,
  file: File
): Promise<boolean> {
  try {
    const storage = getAssetStorage()
    const assetId = await storage.saveFromFile(file)
    const alt = file.name.replace(/\.[^.]+$/, '') || '图片'
    const dataUrl = storage.getDataUrl(assetId)
    if (!dataUrl) throw new Error('图片读取失败')
    // WYSIWYG 中插入 data URL 以便立即显示；保存时 restore 回 markflow-asset://
    const slice = parseMarkdownSlice(ctx, `![${alt}](${dataUrl})`)
    if (!slice) return false
    view.dispatch(view.state.tr.replaceSelection(slice))
    return true
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    showAppNotification(msg)
    return false
  }
}

/// 粘贴/拖拽图片时保存为本地 asset 并插入 Markdown 引用
export const imagePaste = $prose((ctx) => {
  return new Plugin({
    key: new PluginKey('MARKFLOW_IMAGE_PASTE'),
    props: {
      handlePaste(view, event) {
        const { clipboardData } = event
        if (!clipboardData || !isEditable(view)) return false
        if (view.state.selection.$from.node().type.spec.code) return false

        const file = getClipboardImageFile(clipboardData)
        if (!file) return false

        event.preventDefault()
        void insertImageMarkdown(ctx, view, file)
        return true
      },
      handleDrop(view, event) {
        if (!isEditable(view)) return false
        const file = [...(event.dataTransfer?.files ?? [])].find((f) =>
          f.type.startsWith('image/')
        )
        if (!file) return false

        event.preventDefault()
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })
        if (pos) {
          view.dispatch(
            view.state.tr.setSelection(Selection.near(view.state.doc.resolve(pos.pos)))
          )
        }
        void insertImageMarkdown(ctx, view, file)
        return true
      },
    },
  })
})

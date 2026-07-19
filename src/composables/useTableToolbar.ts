import { ref, onBeforeUnmount, type Ref } from 'vue'
import { editorViewCtx } from '@milkdown/core'
import type { Editor } from '@milkdown/core'
import type { EditorState } from '@milkdown/prose/state'

export function isCursorInTable(state: EditorState): boolean {
  const { $from } = state.selection
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === 'table') return true
  }
  return false
}

export function useTableToolbar(editorRef: () => Editor | null) {
  const isInTable = ref(false)
  let unsubscribe: (() => void) | null = null

  function check() {
    const editor = editorRef()
    if (!editor) { isInTable.value = false; return }
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      isInTable.value = isCursorInTable(view.state)
    })
  }

  function attach() {
    const editor = editorRef()
    if (!editor) return
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const handler = () => { isInTable.value = isCursorInTable(view.state) }
      view.dom.addEventListener('mouseup', handler)
      view.dom.addEventListener('keyup', handler)
      unsubscribe = () => {
        view.dom.removeEventListener('mouseup', handler)
        view.dom.removeEventListener('keyup', handler)
      }
    })
  }

  function detach() {
    unsubscribe?.()
    unsubscribe = null
  }

  onBeforeUnmount(detach)

  return { isInTable, check, attach, detach }
}

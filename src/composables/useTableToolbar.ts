import { ref, onBeforeUnmount, type Ref } from 'vue'
import { editorViewCtx } from '@milkdown/core'
import type { Editor } from '@milkdown/core'
import type { EditorState } from '@milkdown/prose/state'
import { coordsAtPos } from '@milkdown/prose/view'

export function isCursorInTable(state: EditorState): boolean {
  const { $from } = state.selection
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === 'table') return true
  }
  return false
}

export function useTableToolbar(editorRef: () => Editor | null) {
  const isInTable = ref(false)
  const toolbarPosition = ref<{ top: number; left: number }>({ top: 0, left: 0 })
  let unsubscribe: (() => void) | null = null

  function updatePosition() {
    const editor = editorRef()
    if (!editor) return
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const { state } = view
      if (!isCursorInTable(state)) return
      try {
        const { $from } = state.selection
        const start = $from.start($from.depth)
        const end = $from.end($from.depth)
        const mid = start + Math.floor((end - start) / 2) || start
        const coords = coordsAtPos(mid, view)
        const editorRect = view.dom.getBoundingClientRect()
        toolbarPosition.value = {
          top: coords.top - editorRect.top,
          left: coords.left - editorRect.left + 8,
        }
      } catch {
        // coordsAtPos may throw for empty/invalid selections
      }
    })
  }

  function check() {
    const editor = editorRef()
    if (!editor) { isInTable.value = false; return }
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const inTable = isCursorInTable(view.state)
      isInTable.value = inTable
      if (inTable) updatePosition()
    })
  }

  function attach() {
    const editor = editorRef()
    if (!editor) return
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const handler = () => {
        const inTable = isCursorInTable(view.state)
        isInTable.value = inTable
        if (inTable) updatePosition()
      }
      view.dom.addEventListener('mouseup', handler)
      view.dom.addEventListener('keyup', handler)
      const scrollHandler = () => { if (isInTable.value) updatePosition() }
      view.dom.addEventListener('scroll', scrollHandler)
      window.addEventListener('resize', updatePosition)
      unsubscribe = () => {
        view.dom.removeEventListener('mouseup', handler)
        view.dom.removeEventListener('keyup', handler)
        view.dom.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('resize', updatePosition)
      }
    })
  }

  function detach() {
    unsubscribe?.()
    unsubscribe = null
  }

  onBeforeUnmount(detach)

  return { isInTable, toolbarPosition, check, attach, detach }
}

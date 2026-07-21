import { ref, onBeforeUnmount } from 'vue'
import { editorViewCtx } from '@milkdown/core'
import type { Editor } from '@milkdown/core'
import type { EditorState } from '@milkdown/prose/state'
import { Decoration, DecorationSet } from '@milkdown/prose/view'

export interface TableToolbarContext {
  rowIndex: number
  colIndex: number
  rowCount: number
  colCount: number
  canDeleteRow: boolean
  canDeleteCol: boolean
}

export function isCursorInTable(state: EditorState): boolean {
  return getTableToolbarContext(state) !== null
}

export function findTableNodePos(state: EditorState): number | null {
  const { $from } = state.selection
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === 'table') {
      return $from.before(depth)
    }
  }
  return null
}

export function getTableToolbarContext(state: EditorState): TableToolbarContext | null {
  const { $from } = state.selection
  let tableDepth = -1
  let rowDepth = -1
  let cellDepth = -1

  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth)
    if (tableDepth < 0 && node.type.name === 'table') tableDepth = depth
    if (rowDepth < 0 && (node.type.name === 'table_row' || node.type.name === 'table_header_row')) rowDepth = depth
    if (cellDepth < 0 && (node.type.name === 'table_cell' || node.type.name === 'table_header')) cellDepth = depth
  }

  if (tableDepth < 0) return null

  const tableNode = $from.node(tableDepth)
  const rowCount = tableNode.childCount
  if (rowCount <= 0) return null

  const rowIndex = rowDepth >= 0 ? $from.index(rowDepth - 1) : Math.min($from.index(tableDepth), rowCount - 1)
  const effectiveRowNode = tableNode.child(Math.max(0, rowIndex))
  const colCount = effectiveRowNode.childCount
  if (colCount <= 0) return null

  const colIndex =
    cellDepth >= 0 ? $from.index(cellDepth - 1) : rowDepth >= 0 ? Math.min($from.index(rowDepth), colCount - 1) : 0

  return {
    rowIndex,
    colIndex,
    rowCount,
    colCount,
    canDeleteRow: rowCount > 1,
    canDeleteCol: colCount > 1,
  }
}

export function getTableToolbarDecorations(state: EditorState): DecorationSet | null {
  const tablePos = findTableNodePos(state)
  if (tablePos == null) return null

  const widget = Decoration.widget(
    tablePos,
    () => {
      const slot = document.createElement('div')
      slot.className = 'markflow-table-toolbar-slot'
      slot.setAttribute('data-testid', 'table-toolbar-slot')
      slot.setAttribute('contenteditable', 'false')
      return slot
    },
    {
      side: -1,
      block: true,
      key: 'markflow-table-toolbar-slot',
      stopEvent: () => true,
      ignoreSelection: true,
    },
  )

  return DecorationSet.create(state.doc, [widget])
}

export function useTableToolbar(editorRef: () => Editor | null) {
  const isInTable = ref(false)
  const tableContext = ref<TableToolbarContext | null>(null)
  const toolbarMountEl = ref<HTMLElement | null>(null)
  let unsubscribe: (() => void) | null = null

  function syncToolbarMount(view: { dom: ParentNode }) {
    toolbarMountEl.value = view.dom.querySelector<HTMLElement>('.markflow-table-toolbar-slot')
  }

  function syncState() {
    const editor = editorRef()
    if (!editor) {
      isInTable.value = false
      tableContext.value = null
      toolbarMountEl.value = null
      return
    }
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const context = getTableToolbarContext(view.state)
      tableContext.value = context
      isInTable.value = context !== null
      if (context) {
        syncToolbarMount(view)
      } else {
        toolbarMountEl.value = null
      }
    })
  }

  function check() {
    syncState()
  }

  function attach() {
    const editor = editorRef()
    if (!editor) return
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const handler = () => syncState()
      view.dom.addEventListener('mouseup', handler)
      view.dom.addEventListener('keyup', handler)
      view.dom.addEventListener('focusin', handler)
      unsubscribe = () => {
        view.dom.removeEventListener('mouseup', handler)
        view.dom.removeEventListener('keyup', handler)
        view.dom.removeEventListener('focusin', handler)
      }
    })
  }

  function detach() {
    unsubscribe?.()
    unsubscribe = null
  }

  onBeforeUnmount(detach)

  return { isInTable, tableContext, toolbarMountEl, check, attach, detach }
}

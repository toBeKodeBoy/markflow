import { ref, onBeforeUnmount } from 'vue'
import { editorViewCtx } from '@milkdown/core'
import type { Editor } from '@milkdown/core'
import type { EditorState } from '@milkdown/prose/state'

const TOOLBAR_HEIGHT = 36
const TOOLBAR_CONTEXT_SELECTOR = '.wysiwyg-body'
const TABLE_TOOLBAR_OFFSET_VAR = '--table-toolbar-offset'
const TABLE_TOOLBAR_OFFSET_CLASS = 'table-toolbar-offset'

export interface TableToolbarContext {
  rowIndex: number
  colIndex: number
  rowCount: number
  colCount: number
  canDeleteRow: boolean
  canDeleteCol: boolean
}

export interface TableToolbarPosition {
  top: number
  left: number
  width: number
}

export function isCursorInTable(state: EditorState): boolean {
  return getTableToolbarContext(state) !== null
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

function getTableElement(state: EditorState, view: any): HTMLElement | null {
  const { $from } = state.selection
  let tableDepth = -1
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === 'table') {
      tableDepth = depth
      break
    }
  }
  if (tableDepth < 0) return null
  try {
    const tablePos = $from.before(tableDepth)
    const tableNode = view.nodeDOM(tablePos) as Node | null
    const tableElement =
      tableNode instanceof HTMLElement
        ? tableNode.closest('.tableWrapper') ?? tableNode
        : tableNode?.parentElement?.closest('.tableWrapper') ?? tableNode?.parentElement ?? null
    return tableElement instanceof HTMLElement ? tableElement : null
  } catch {
    return null
  }
}

function getTableDomRect(state: EditorState, view: any): DOMRect | null {
  return getTableElement(state, view)?.getBoundingClientRect() ?? null
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function resolveToolbarPosition(tableRect: DOMRect, contextRect: DOMRect): TableToolbarPosition {
  const contextHeight = contextRect.height
  const contextWidth = contextRect.width
  const width = Math.min(tableRect.width, contextWidth)
  const left = clamp(tableRect.left - contextRect.left, 0, Math.max(contextWidth - width, 0))
  const maxTop = Math.max(contextHeight - TOOLBAR_HEIGHT, 0)
  return {
    top: clamp(tableRect.top - contextRect.top - TOOLBAR_HEIGHT, 0, maxTop),
    left,
    width,
  }
}

export function useTableToolbar(editorRef: () => Editor | null) {
  const isInTable = ref(false)
  const toolbarPosition = ref<TableToolbarPosition>({ top: 0, left: 0, width: 0 })
  const tableContext = ref<TableToolbarContext | null>(null)
  let unsubscribe: (() => void) | null = null
  let compensatedTable: HTMLElement | null = null

  function clearTableOffset() {
    if (!compensatedTable) return
    compensatedTable.classList.remove(TABLE_TOOLBAR_OFFSET_CLASS)
    compensatedTable.style.removeProperty(TABLE_TOOLBAR_OFFSET_VAR)
    compensatedTable = null
  }

  function applyTableOffset(tableElement: HTMLElement, offset: number) {
    if (offset <= 0) {
      if (compensatedTable === tableElement) clearTableOffset()
      return false
    }
    if (compensatedTable && compensatedTable !== tableElement) clearTableOffset()
    tableElement.classList.add(TABLE_TOOLBAR_OFFSET_CLASS)
    tableElement.style.setProperty(TABLE_TOOLBAR_OFFSET_VAR, `${offset}px`)
    compensatedTable = tableElement
    return true
  }

  function ensureToolbarClearance(tableElement: HTMLElement, tableRect: DOMRect, contextRect: DOMRect) {
    const availableTop = tableRect.top - contextRect.top
    const hiddenHeight = Math.max(TOOLBAR_HEIGHT - availableTop, 0)
    return applyTableOffset(tableElement, hiddenHeight)
  }

  function updatePosition() {
    const editor = editorRef()
    if (!editor) return
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const tableContext = getTableToolbarContext(view.state)
      if (!tableContext) return
      const tableElement = getTableElement(view.state, view)
      if (!tableElement) return
      let tableRect = getTableDomRect(view.state, view)
      if (!tableRect) return
      const toolbarContext = view.dom.closest(TOOLBAR_CONTEXT_SELECTOR) ?? view.dom.closest('.wysiwyg-pane')
      if (!toolbarContext) return
      const contextRect = toolbarContext.getBoundingClientRect()
      if (ensureToolbarClearance(tableElement, tableRect, contextRect)) {
        tableRect = getTableDomRect(view.state, view)
        if (!tableRect) return
      } else if (compensatedTable && compensatedTable !== tableElement) {
        clearTableOffset()
      }
      toolbarPosition.value = resolveToolbarPosition(tableRect, contextRect)
    })
  }

  function syncState() {
    const editor = editorRef()
    if (!editor) {
      isInTable.value = false
      tableContext.value = null
      toolbarPosition.value = { top: 0, left: 0, width: 0 }
      clearTableOffset()
      return
    }
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const context = getTableToolbarContext(view.state)
      tableContext.value = context
      isInTable.value = context !== null
      if (context) {
        updatePosition()
      } else {
        toolbarPosition.value = { top: 0, left: 0, width: 0 }
        clearTableOffset()
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
      const scrollHandler = () => {
        if (isInTable.value) updatePosition()
      }
      const scrollContainer = view.dom.closest('.milkdown-host')
      scrollContainer?.addEventListener('scroll', scrollHandler)
      window.addEventListener('resize', updatePosition)
      unsubscribe = () => {
        view.dom.removeEventListener('mouseup', handler)
        view.dom.removeEventListener('keyup', handler)
        view.dom.removeEventListener('focusin', handler)
        scrollContainer?.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('resize', updatePosition)
      }
    })
  }

  function detach() {
    unsubscribe?.()
    unsubscribe = null
    clearTableOffset()
  }

  onBeforeUnmount(detach)

  return { isInTable, tableContext, toolbarPosition, check, attach, detach }
}

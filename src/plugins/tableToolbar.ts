import type { MilkdownPlugin } from '@milkdown/ctx'
import type { Editor } from '@milkdown/core'
import { $prose } from '@milkdown/utils'
import type { Node as ProseNode } from '@milkdown/prose/model'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { Decoration, DecorationSet, type EditorView } from '@milkdown/prose/view'
import { h, render } from 'vue'
import TableToolbar from '../components/TableToolbar.vue'
import type { TableToolbarContext } from '../types'

interface TableToolbarActions {
  addRowBefore: () => void
  addRowAfter: () => void
  addColBefore: () => void
  addColAfter: () => void
  setColAlign: (alignment: 'left' | 'center' | 'right') => void
  deleteRow: () => void
  deleteCol: () => void
  deleteTable: () => void
}

interface TableToolbarOptions {
  editorRef: () => Editor | null
  focusModeRef: () => boolean
  actions: TableToolbarActions
}

function getTableContext(state: EditorView['state']): { pos: number; context: TableToolbarContext } | null {
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
    pos: $from.before(tableDepth),
    context: {
      rowIndex,
      colIndex,
      rowCount,
      colCount,
      canDeleteRow: rowCount > 1,
      canDeleteCol: colCount > 1,
    },
  }
}

function createToolbarDom(context: TableToolbarContext, actions: TableToolbarActions) {
  const container = document.createElement('div')
  container.className = 'table-toolbar-widget'
  container.dataset.testid = 'table-toolbar-widget'
  container.contentEditable = 'false'

  render(
    h(TableToolbar, {
      context,
      onAddRowBefore: actions.addRowBefore,
      onAddRowAfter: actions.addRowAfter,
      onAddColBefore: actions.addColBefore,
      onAddColAfter: actions.addColAfter,
      onSetColAlign: actions.setColAlign,
      onDeleteRow: actions.deleteRow,
      onDeleteCol: actions.deleteCol,
      onDeleteTable: actions.deleteTable,
    }),
    container,
  )

  return container
}

function isSameTable(a: { pos: number; context: TableToolbarContext } | null, b: { pos: number; context: TableToolbarContext } | null) {
  if (!a || !b) return false
  return (
    a.pos === b.pos
    && a.context.rowIndex === b.context.rowIndex
    && a.context.colIndex === b.context.colIndex
    && a.context.rowCount === b.context.rowCount
    && a.context.colCount === b.context.colCount
    && a.context.canDeleteRow === b.context.canDeleteRow
    && a.context.canDeleteCol === b.context.canDeleteCol
  )
}

function buildDecorations(doc: ProseNode, table: { pos: number; context: TableToolbarContext } | null, options: TableToolbarOptions) {
  if (!table || options.focusModeRef()) return DecorationSet.empty

  const widget = Decoration.widget(
    table.pos,
    () => createToolbarDom(table.context, options.actions),
    {
      side: -1,
      key: `table-toolbar-${table.pos}-${table.context.rowIndex}-${table.context.colIndex}-${table.context.rowCount}-${table.context.colCount}`,
      stopEvent: (event) => event.target instanceof Node
        && (event.target as HTMLElement | null)?.closest?.('.table-toolbar-widget, .table-toolbar') != null,
      destroy: (dom) => {
        render(null, dom as Element)
      },
    },
  )

  return DecorationSet.create(doc, [widget])
}

export function tableToolbarPlugin(options: TableToolbarOptions): MilkdownPlugin {
  return $prose(() => {
    return new Plugin<DecorationSet>({
      key: new PluginKey('MARKFLOW_TABLE_TOOLBAR'),
      state: {
        init(_, state) {
          return buildDecorations(state.doc, getTableContext(state), options)
        },
        apply(tr, old, oldState, newState) {
          if (!tr.docChanged && !tr.selectionSet) return old
          const previous = getTableContext(oldState)
          const next = getTableContext(newState)
          if (!tr.docChanged && isSameTable(previous, next)) return old
          return buildDecorations(newState.doc, next, options)
        },
      },
      props: {
        decorations(state) {
          return this.getState(state)
        },
      },
      view(view) {
        return {
          update(nextView, prevState) {
            if (prevState.selection.eq(nextView.state.selection) && prevState.doc.eq(nextView.state.doc)) return
          },
          destroy() {
            const widgets = view.dom.querySelectorAll('.table-toolbar-widget')
            widgets.forEach((widget) => render(null, widget as Element))
          },
        }
      },
    })
  })
}

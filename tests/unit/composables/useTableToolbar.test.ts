import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  findTableNodePos,
  getTableToolbarContext,
  getTableToolbarDecorations,
  isCursorInTable,
  useTableToolbar,
} from '../../../src/composables/useTableToolbar'
import { Schema } from '@milkdown/prose/model'
import { EditorState, TextSelection } from '@milkdown/prose/state'
import { EditorView } from '@milkdown/prose/view'

const tableSchema = new Schema({
  nodes: {
    doc: { content: 'block+', toDOM: () => ['div', 0] as const },
    paragraph: {
      group: 'block',
      content: 'text*',
      toDOM: () => ['p', 0] as const,
      parseDOM: [{ tag: 'p' }],
    },
    table: {
      group: 'block',
      content: 'table_row+',
      toDOM: () => ['table', 0] as const,
      parseDOM: [{ tag: 'table' }],
    },
    table_row: {
      content: 'table_cell+',
      toDOM: () => ['tr', 0] as const,
      parseDOM: [{ tag: 'tr' }],
    },
    table_cell: {
      content: 'paragraph',
      toDOM: () => ['td', 0] as const,
      parseDOM: [{ tag: 'td' }],
    },
    text: { group: 'inline' },
  },
})

function createTableDoc(): ReturnType<typeof tableSchema.node> {
  const cell = (text: string) =>
    tableSchema.node('table_cell', null, [tableSchema.node('paragraph', null, text ? [tableSchema.text(text)] : [])])
  const row = tableSchema.node('table_row', null, [cell('a'), cell('b'), cell('c')])
  return tableSchema.node('doc', null, [
    tableSchema.node('paragraph', null, [tableSchema.text('before')]),
    tableSchema.node('table', null, [row, row, row]),
    tableSchema.node('paragraph', null, [tableSchema.text('after')]),
  ])
}

function createView(doc: ReturnType<typeof tableSchema.node>): EditorView {
  const parent = document.createElement('div')
  document.body.appendChild(parent)
  return new EditorView(parent, {
    state: EditorState.create({ doc }),
  })
}

describe('isCursorInTable', () => {
  it('returns true when cursor is inside a table cell', () => {
    const doc = createTableDoc()
    const view = createView(doc)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, 9)))
    expect(isCursorInTable(view.state)).toBe(true)
    view.destroy()
  })

  it('returns false when cursor is in a paragraph outside table', () => {
    const doc = createTableDoc()
    const view = createView(doc)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, 1)))
    expect(isCursorInTable(view.state)).toBe(false)
    view.destroy()
  })
})

describe('getTableToolbarContext', () => {
  it('returns row and column context for the current cell', () => {
    const doc = createTableDoc()
    const view = createView(doc)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, 15)))

    expect(getTableToolbarContext(view.state)).toEqual({
      rowIndex: 0,
      colIndex: 1,
      rowCount: 3,
      colCount: 3,
      canDeleteRow: true,
      canDeleteCol: true,
    })

    view.destroy()
  })
})

describe('table toolbar decorations', () => {
  it('creates a block widget decoration before the active table', () => {
    const doc = createTableDoc()
    const view = createView(doc)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, 9)))

    const tablePos = findTableNodePos(view.state)
    const decorations = getTableToolbarDecorations(view.state)
    const widgets = decorations?.find() ?? []

    expect(tablePos).not.toBeNull()
    expect(widgets).toHaveLength(1)
    expect(widgets[0].from).toBe(tablePos)
    expect(widgets[0].spec.side).toBe(-1)
    expect(widgets[0].spec.block).toBe(true)
    expect(widgets[0].spec.key).toBe('markflow-table-toolbar-slot')

    view.destroy()
  })

  it('returns null when the current selection is outside a table', () => {
    const doc = createTableDoc()
    const view = createView(doc)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, 1)))

    expect(findTableNodePos(view.state)).toBeNull()
    expect(getTableToolbarDecorations(view.state)).toBeNull()

    view.destroy()
  })
})

describe('useTableToolbar slot tracking', () => {
  let view: EditorView

  beforeEach(() => {
    view = createView(createTableDoc())
  })

  afterEach(() => {
    view.destroy()
  })

  function makeEditorMock() {
    return {
      action: (runner: (ctx: { get: (key: unknown) => unknown }) => void) => {
        runner({
          get: () => ({
            state: view.state,
            dom: view.dom,
          }),
        })
      },
    }
  }

  it('syncs the toolbar mount element from the document-flow slot', () => {
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 9)))
    const slot = document.createElement('div')
    slot.className = 'markflow-table-toolbar-slot'
    view.dom.appendChild(slot)

    const { check, toolbarMountEl } = useTableToolbar(() => makeEditorMock() as any)
    check()

    expect(toolbarMountEl.value).toBe(slot)
  })

  it('clears the toolbar mount element when the selection leaves the table', () => {
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 9)))
    const slot = document.createElement('div')
    slot.className = 'markflow-table-toolbar-slot'
    view.dom.appendChild(slot)

    const { check, toolbarMountEl } = useTableToolbar(() => makeEditorMock() as any)
    check()
    expect(toolbarMountEl.value).toBe(slot)

    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1)))
    check()
    expect(toolbarMountEl.value).toBeNull()
  })

  it('resets mount state when editor is null', () => {
    const { check, toolbarMountEl } = useTableToolbar(() => null as any)
    check()
    expect(toolbarMountEl.value).toBeNull()
  })
})

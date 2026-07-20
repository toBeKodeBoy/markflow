import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getTableToolbarContext, isCursorInTable, useTableToolbar } from '../../../src/composables/useTableToolbar'
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

describe('useTableToolbar position tracking', () => {
  let milkdownHost: HTMLDivElement
  let activeSelectionPos = 9

  beforeEach(() => {
    milkdownHost = document.createElement('div')
    milkdownHost.className = 'milkdown-host'
    document.body.appendChild(milkdownHost)
  })

  afterEach(() => {
    milkdownHost.remove()
  })

  function makeEditorMock(
    tableRect: DOMRect,
    bodyRect: DOMRect,
    options?: { selectionPos?: number }
  ) {
    const doc = createTableDoc()
    const view = createView(doc)
    activeSelectionPos = options?.selectionPos ?? 9
    view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, activeSelectionPos)))

    const tableEl = document.createElement('div')
    tableEl.className = 'tableWrapper'
    tableEl.getBoundingClientRect = () => {
      const offset = Number.parseFloat(tableEl.style.getPropertyValue('--table-toolbar-offset') || '0') || 0
      return new DOMRect(tableRect.x, tableRect.y + offset, tableRect.width, tableRect.height)
    }

    return {
      view,
      tableEl,
      action: (runner: (ctx: { get: (key: unknown) => unknown }) => void) => {
        runner({
          get: () => ({
            state: view.state,
            dom: {
              closest: (sel: string) => {
                if (sel === '.milkdown-host') return milkdownHost
                if (sel === '.wysiwyg-body') {
                  return {
                    getBoundingClientRect: () => bodyRect,
                  }
                }
                if (sel === '.wysiwyg-pane') {
                  return {
                    getBoundingClientRect: () => bodyRect,
                  }
                }
                return null
              },
            },
            nodeDOM: () => tableEl,
          }),
        })
      },
    }
  }

  it('anchors toolbar to the table top-left and keeps the same width as table wrapper', () => {
    const tableRect = new DOMRect(150, 200, 400, 120)
    const bodyRect = new DOMRect(0, 50, 600, 500)
    const editorMock = makeEditorMock(tableRect, bodyRect)
    const { check, toolbarPosition } = useTableToolbar(() => editorMock as any)

    check()

    expect(toolbarPosition.value.top).toBe(114)
    expect(toolbarPosition.value.left).toBe(150)
    expect(toolbarPosition.value.width).toBe(400)
  })

  it('adds top offset to the active table wrapper when the toolbar would cover previous content', () => {
    const bodyRect = new DOMRect(0, 50, 600, 500)
    const editorMock = makeEditorMock(new DOMRect(10, 70, 300, 100), bodyRect)
    const { check, toolbarPosition } = useTableToolbar(() => editorMock as any)

    check()

    expect(editorMock.tableEl.classList.contains('table-toolbar-offset')).toBe(true)
    expect(editorMock.tableEl.style.getPropertyValue('--table-toolbar-offset')).toBe('16px')
    expect(toolbarPosition.value.top).toBe(0)
    expect(toolbarPosition.value.left).toBe(10)
    expect(toolbarPosition.value.width).toBe(300)
  })

  it('does not add offset when there is already enough top space', () => {
    const tableRect = new DOMRect(10, 100, 300, 100)
    const bodyRect = new DOMRect(0, 50, 600, 500)
    const editorMock = makeEditorMock(tableRect, bodyRect)
    const { check, toolbarPosition } = useTableToolbar(() => editorMock as any)

    check()

    expect(editorMock.tableEl.classList.contains('table-toolbar-offset')).toBe(false)
    expect(editorMock.tableEl.style.getPropertyValue('--table-toolbar-offset')).toBe('')
    expect(toolbarPosition.value.top).toBe(14)
    expect(toolbarPosition.value.left).toBe(10)
    expect(toolbarPosition.value.width).toBe(300)
  })

  it('clamps left within pane width when table is close to the right edge', () => {
    const tableRect = new DOMRect(560, 200, 180, 100)
    const bodyRect = new DOMRect(0, 50, 600, 500)
    const editorMock = makeEditorMock(tableRect, bodyRect)
    const { check, toolbarPosition } = useTableToolbar(() => editorMock as any)

    check()

    expect(toolbarPosition.value.left).toBe(420)
    expect(toolbarPosition.value.width).toBe(180)
  })

  it('toolbarPosition is reset when editor is null', () => {
    const { check, toolbarPosition } = useTableToolbar(() => null as any)
    check()
    expect(toolbarPosition.value).toEqual({ top: 0, left: 0, width: 0 })
  })

  it('clears the offset when selection leaves the table', () => {
    const tableRect = new DOMRect(10, 70, 300, 100)
    const bodyRect = new DOMRect(0, 50, 600, 500)
    const editorMock = makeEditorMock(tableRect, bodyRect)
    const { check, toolbarPosition } = useTableToolbar(() => editorMock as any)

    check()
    expect(editorMock.tableEl.classList.contains('table-toolbar-offset')).toBe(true)

    editorMock.view.dispatch(editorMock.view.state.tr.setSelection(TextSelection.create(editorMock.view.state.doc, 1)))
    check()

    expect(editorMock.tableEl.classList.contains('table-toolbar-offset')).toBe(false)
    expect(editorMock.tableEl.style.getPropertyValue('--table-toolbar-offset')).toBe('')
    expect(toolbarPosition.value).toEqual({ top: 0, left: 0, width: 0 })
  })
})

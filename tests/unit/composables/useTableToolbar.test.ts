import { describe, it, expect, vi } from 'vitest'
import { isCursorInTable, useTableToolbar } from '../../../src/composables/useTableToolbar'
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

  it('returns false for empty selection outside table', () => {
    const doc = createTableDoc()
    const view = createView(doc)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, 0)))
    expect(isCursorInTable(view.state)).toBe(false)
    view.destroy()
  })

  it('returns true for any position inside table', () => {
    const doc = createTableDoc()
    const view = createView(doc)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, 47)))
    expect(isCursorInTable(view.state)).toBe(true)
    view.destroy()
  })
})

describe('useTableToolbar toolbarPosition', () => {
  it('updates position when cursor is inside table', () => {
    const doc = createTableDoc()
    const view = createView(doc)
    view.dom.getBoundingClientRect = () => ({
      top: 100, left: 200, width: 800, height: 600,
      bottom: 700, right: 1000, x: 200, y: 100, toJSON: () => {},
    } as DOMRect)
    const editorMock = {
      action: (runner: (ctx: { get: (key: unknown) => unknown }) => void) => {
        runner({ get: () => view })
      },
    }
    const { isInTable, toolbarPosition, check } = useTableToolbar(() => editorMock as any)
    // trigger selection inside table cell, then check
    view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, 9)))
    check()
    expect(isInTable.value).toBe(true)
    expect(typeof toolbarPosition.value.top).toBe('number')
    expect(typeof toolbarPosition.value.left).toBe('number')
    view.destroy()
  })

  it('does not change position when cursor is outside table', () => {
    const doc = createTableDoc()
    const view = createView(doc)
    const editorMock = {
      action: (runner: (ctx: { get: (key: unknown) => unknown }) => void) => {
        runner({ get: () => view })
      },
    }
    const { isInTable, toolbarPosition, check } = useTableToolbar(() => editorMock as any)
    // cursor at doc start (outside table)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, 1)))
    check()
    expect(isInTable.value).toBe(false)
    // toolbarPosition remains at initial {0,0}
    expect(toolbarPosition.value).toEqual({ top: 0, left: 0 })
    view.destroy()
  })
})

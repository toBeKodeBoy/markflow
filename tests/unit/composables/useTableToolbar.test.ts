import { describe, it, expect } from 'vitest'
import { isCursorInTable } from '../../../src/composables/useTableToolbar'
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
    // cursor inside first table_cell (pos 9 is inside "a" text)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, 9)))
    expect(isCursorInTable(view.state)).toBe(true)
    view.destroy()
  })

  it('returns false when cursor is in a paragraph outside table', () => {
    const doc = createTableDoc()
    const view = createView(doc)
    // cursor in "before" paragraph (pos 1)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, 1)))
    expect(isCursorInTable(view.state)).toBe(false)
    view.destroy()
  })

  it('returns false for empty selection outside table', () => {
    const doc = createTableDoc()
    const view = createView(doc)
    // cursor at very start of doc
    view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, 0)))
    expect(isCursorInTable(view.state)).toBe(false)
    view.destroy()
  })

  it('returns true for any position inside table', () => {
    const doc = createTableDoc()
    const view = createView(doc)
    // cursor in last cell of last row
    view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, 47)))
    expect(isCursorInTable(view.state)).toBe(true)
    view.destroy()
  })
})

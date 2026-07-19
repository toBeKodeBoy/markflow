import { describe, expect, it, vi } from 'vitest'
import type { Editor } from '@milkdown/core'
import { editorViewCtx, schemaCtx, commandsCtx } from '@milkdown/core'
import {
  insertTableCommand,
  addRowAfterCommand,
  addColAfterCommand,
  selectRowCommand,
  selectColCommand,
  selectTableCommand,
  deleteSelectedCellsCommand,
  setAlignCommand,
} from '@milkdown/preset-gfm'
import { Schema } from '@milkdown/prose/model'
import { EditorState, TextSelection } from '@milkdown/prose/state'
import { EditorView } from '@milkdown/prose/view'
import {
  wysiwygToggleInlineCode,
  wysiwygInsertTable,
  wysiwygAddRowAfter,
  wysiwygAddColAfter,
  wysiwygDeleteRow,
  wysiwygDeleteCol,
  wysiwygDeleteTable,
  wysiwygSetColAlign,
} from '../../../src/utils/wysiwygFormat'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+', toDOM: () => ['div', 0] as const },
    paragraph: {
      group: 'block',
      content: 'text*',
      toDOM: () => ['p', 0] as const,
      parseDOM: [{ tag: 'p' }],
    },
    text: { group: 'inline' },
  },
  marks: {
    inlineCode: {
      toDOM: () => ['code', 0] as const,
      parseDOM: [{ tag: 'code' }],
    },
  },
})

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

function createView(text: string): EditorView {
  const parent = document.createElement('div')
  document.body.appendChild(parent)
  const doc = schema.node('doc', null, [schema.node('paragraph', null, text ? [schema.text(text)] : [])])
  return new EditorView(parent, {
    state: EditorState.create({ doc }),
  })
}

function createTableView(): EditorView {
  const parent = document.createElement('div')
  document.body.appendChild(parent)
  const cell = (text: string) =>
    tableSchema.node('table_cell', null, [tableSchema.node('paragraph', null, [tableSchema.text(text)])])
  const row = tableSchema.node('table_row', null, [cell('a'), cell('b'), cell('c')])
  const doc = tableSchema.node('doc', null, [
    tableSchema.node('table', null, [row, row, row]),
  ])
  return new EditorView(parent, {
    state: EditorState.create({ doc }),
  })
}

function createEditorWithCommands(
  view: EditorView,
  mockCall: ReturnType<typeof vi.fn>,
  s: Schema = schema,
): Editor {
  return {
    action: (runner: (ctx: { get: (key: unknown) => unknown }) => void) => {
      runner({
        get: (key: unknown) => {
          if (key === editorViewCtx) return view
          if (key === schemaCtx) return s
          if (key === commandsCtx) return { call: mockCall }
          throw new Error('Unexpected Milkdown context key')
        },
      })
    },
  } as unknown as Editor
}

describe('wysiwygToggleInlineCode', () => {
  it('inserts a marked code placeholder for an empty selection', () => {
    const view = createView('hello')
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1)))

    const editor = createEditorWithCommands(view, vi.fn())
    wysiwygToggleInlineCode(editor)

    expect(view.state.doc.textContent).toBe('codehello')
    expect(view.state.selection.from).toBe(1)
    expect(view.state.selection.to).toBe(5)
    const marks = view.state.doc.resolve(1).marks()
    expect(marks.some((mark) => mark.type.name === 'inlineCode')).toBe(true)
    view.destroy()
  })
})

describe('wysiwygInsertTable', () => {
  it('calls insertTableCommand via commandsCtx', () => {
    const view = createView('hello')
    const mockCall = vi.fn().mockReturnValue(true)
    const editor = createEditorWithCommands(view, mockCall)

    wysiwygInsertTable(editor)

    expect(mockCall).toHaveBeenCalledOnce()
    expect(mockCall).toHaveBeenCalledWith(insertTableCommand.key)
    view.destroy()
  })

  it('does nothing when editor is null', () => {
    wysiwygInsertTable(null)
  })
})

describe('wysiwygAddRowAfter', () => {
  it('calls addRowAfterCommand via commandsCtx', () => {
    const view = createView('hello')
    const mockCall = vi.fn().mockReturnValue(true)
    const editor = createEditorWithCommands(view, mockCall)

    wysiwygAddRowAfter(editor)

    expect(mockCall).toHaveBeenCalledOnce()
    expect(mockCall).toHaveBeenCalledWith(addRowAfterCommand.key)
    view.destroy()
  })

  it('does nothing when editor is null', () => {
    wysiwygAddRowAfter(null)
  })
})

describe('wysiwygAddColAfter', () => {
  it('calls addColAfterCommand via commandsCtx', () => {
    const view = createView('hello')
    const mockCall = vi.fn().mockReturnValue(true)
    const editor = createEditorWithCommands(view, mockCall)

    wysiwygAddColAfter(editor)

    expect(mockCall).toHaveBeenCalledOnce()
    expect(mockCall).toHaveBeenCalledWith(addColAfterCommand.key)
    view.destroy()
  })

  it('does nothing when editor is null', () => {
    wysiwygAddColAfter(null)
  })
})

describe('wysiwygDeleteRow', () => {
  it('calls selectRowCommand with cursor row index then deleteSelectedCellsCommand', () => {
    const view = createTableView()
    // cursor inside first cell text "a" (pos 5)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 5)))
    const mockCall = vi.fn().mockReturnValue(true)
    const editor = createEditorWithCommands(view, mockCall, tableSchema)

    wysiwygDeleteRow(editor)

    expect(mockCall).toHaveBeenCalledTimes(2)
    expect(mockCall).toHaveBeenNthCalledWith(1, selectRowCommand.key, { index: 0 })
    expect(mockCall).toHaveBeenNthCalledWith(2, deleteSelectedCellsCommand.key)
    view.destroy()
  })

  it('does nothing when editor is null', () => {
    wysiwygDeleteRow(null)
  })
})

describe('wysiwygDeleteCol', () => {
  it('calls selectColCommand with cursor col index then deleteSelectedCellsCommand', () => {
    const view = createTableView()
    // cursor inside first cell text "a" (pos 5)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 5)))
    const mockCall = vi.fn().mockReturnValue(true)
    const editor = createEditorWithCommands(view, mockCall, tableSchema)

    wysiwygDeleteCol(editor)

    expect(mockCall).toHaveBeenCalledTimes(2)
    expect(mockCall).toHaveBeenNthCalledWith(1, selectColCommand.key, { index: 0 })
    expect(mockCall).toHaveBeenNthCalledWith(2, deleteSelectedCellsCommand.key)
    view.destroy()
  })

  it('does nothing when editor is null', () => {
    wysiwygDeleteCol(null)
  })
})

describe('wysiwygDeleteTable', () => {
  it('calls selectTableCommand then deleteSelectedCellsCommand', () => {
    const view = createView('hello')
    const mockCall = vi.fn().mockReturnValue(true)
    const editor = createEditorWithCommands(view, mockCall)

    wysiwygDeleteTable(editor)

    expect(mockCall).toHaveBeenCalledTimes(2)
    expect(mockCall).toHaveBeenNthCalledWith(1, selectTableCommand.key)
    expect(mockCall).toHaveBeenNthCalledWith(2, deleteSelectedCellsCommand.key)
    view.destroy()
  })

  it('does nothing when editor is null', () => {
    wysiwygDeleteTable(null)
  })
})

describe('wysiwygSetColAlign', () => {
  it('calls selectColCommand then setAlignCommand with alignment', () => {
    const view = createTableView()
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 5)))
    const mockCall = vi.fn().mockReturnValue(true)
    const editor = createEditorWithCommands(view, mockCall, tableSchema)

    wysiwygSetColAlign(editor, 'center')

    expect(mockCall).toHaveBeenCalledTimes(2)
    expect(mockCall).toHaveBeenNthCalledWith(1, selectColCommand.key, { index: 0 })
    expect(mockCall).toHaveBeenNthCalledWith(2, setAlignCommand.key, 'center')
    view.destroy()
  })

  it('defaults to left alignment when no alignment specified', () => {
    const view = createTableView()
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 5)))
    const mockCall = vi.fn().mockReturnValue(true)
    const editor = createEditorWithCommands(view, mockCall, tableSchema)

    wysiwygSetColAlign(editor)

    expect(mockCall).toHaveBeenCalledTimes(2)
    expect(mockCall).toHaveBeenNthCalledWith(2, setAlignCommand.key, 'left')
    view.destroy()
  })

  it('does nothing when editor is null', () => {
    wysiwygSetColAlign(null)
  })
})

import { describe, expect, it, vi } from 'vitest'
import type { Editor } from '@milkdown/core'
import { editorViewCtx, schemaCtx, commandsCtx } from '@milkdown/core'
import {
  insertTableCommand,
  addRowBeforeCommand,
  addRowAfterCommand,
  addColBeforeCommand,
  addColAfterCommand,
  selectRowCommand,
  selectColCommand,
  selectTableCommand,
  deleteSelectedCellsCommand,
} from '@milkdown/preset-gfm'
import { Schema } from '@milkdown/prose/model'
import { EditorState, TextSelection } from '@milkdown/prose/state'
import { EditorView } from '@milkdown/prose/view'
import {
  wysiwygToggleInlineCode,
  wysiwygInsertTable,
  wysiwygInsertLink,
  wysiwygAddRowBefore,
  wysiwygAddRowAfter,
  wysiwygAddColBefore,
  wysiwygAddColAfter,
  wysiwygDeleteRow,
  wysiwygDeleteCol,
  wysiwygDeleteTable,
  wysiwygToggleTaskItem,
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
    link: {
      attrs: { href: {} },
      toDOM: (mark) => ['a', { href: mark.attrs.href }, 0] as const,
      parseDOM: [{ tag: 'a[href]' }],
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

const taskSchema = new Schema({
  nodes: {
    doc: { content: 'block+', toDOM: () => ['div', 0] as const },
    bullet_list: {
      group: 'block',
      content: 'list_item+',
      toDOM: () => ['ul', 0] as const,
      parseDOM: [{ tag: 'ul' }],
    },
    list_item: {
      content: 'paragraph',
      attrs: {
        checked: { default: null },
        label: { default: '•' },
        listType: { default: 'bullet' },
        spread: { default: 'false' },
      },
      toDOM: (node) => ['li', {
        'data-item-type': node.attrs.checked == null ? null : 'task',
        'data-checked': node.attrs.checked == null ? null : String(node.attrs.checked),
      }, 0] as const,
      parseDOM: [{ tag: 'li' }],
    },
    paragraph: {
      group: 'block',
      content: 'text*',
      toDOM: () => ['p', 0] as const,
      parseDOM: [{ tag: 'p' }],
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

function createTaskListView(): EditorView {
  const parent = document.createElement('div')
  document.body.appendChild(parent)
  const item = (checked: boolean, text: string) =>
    taskSchema.node('list_item', { checked, label: '•', listType: 'bullet', spread: 'false' }, [
      taskSchema.node('paragraph', null, [taskSchema.text(text)]),
    ])
  const doc = taskSchema.node('doc', null, [
    taskSchema.node('bullet_list', null, [item(false, 'first'), item(true, 'second')]),
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
  it('calls insertTableCommand via commandsCtx with default 3x3 size and focuses view', () => {
    const view = createView('hello')
    const focusSpy = vi.spyOn(view, 'focus')
    const mockCall = vi.fn().mockReturnValue(true)
    const editor = createEditorWithCommands(view, mockCall)

    wysiwygInsertTable(editor)

    expect(mockCall).toHaveBeenCalledOnce()
    expect(mockCall).toHaveBeenCalledWith(insertTableCommand.key, { row: 3, col: 3 })
    expect(focusSpy).toHaveBeenCalledOnce()
    view.destroy()
  })

  it('does nothing when editor is null', () => {
    wysiwygInsertTable(null)
  })
})

describe('wysiwygInsertLink', () => {
  it('inserts default markdown link text and href when selection is empty', () => {
    const view = createView('hello')
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1)))
    const editor = createEditorWithCommands(view, vi.fn())

    wysiwygInsertLink(editor)

    expect(view.state.doc.textContent).toContain('链接文字')
    expect(view.state.doc.textContent).not.toBe('hello')
    view.destroy()
  })
})

describe('wysiwygAddRowBefore', () => {
  it('calls addRowBeforeCommand via commandsCtx', () => {
    const view = createView('hello')
    const focusSpy = vi.spyOn(view, 'focus')
    const mockCall = vi.fn().mockReturnValue(true)
    const editor = createEditorWithCommands(view, mockCall)

    wysiwygAddRowBefore(editor)

    expect(mockCall).toHaveBeenCalledOnce()
    expect(mockCall).toHaveBeenCalledWith(addRowBeforeCommand.key)
    expect(focusSpy).toHaveBeenCalledOnce()
    view.destroy()
  })

  it('does nothing when editor is null', () => {
    wysiwygAddRowBefore(null)
  })
})

describe('wysiwygAddRowAfter', () => {
  it('calls addRowAfterCommand via commandsCtx', () => {
    const view = createView('hello')
    const focusSpy = vi.spyOn(view, 'focus')
    const mockCall = vi.fn().mockReturnValue(true)
    const editor = createEditorWithCommands(view, mockCall)

    wysiwygAddRowAfter(editor)

    expect(mockCall).toHaveBeenCalledOnce()
    expect(mockCall).toHaveBeenCalledWith(addRowAfterCommand.key)
    expect(focusSpy).toHaveBeenCalledOnce()
    view.destroy()
  })

  it('does nothing when editor is null', () => {
    wysiwygAddRowAfter(null)
  })
})

describe('wysiwygAddColBefore', () => {
  it('calls addColBeforeCommand via commandsCtx', () => {
    const view = createView('hello')
    const focusSpy = vi.spyOn(view, 'focus')
    const mockCall = vi.fn().mockReturnValue(true)
    const editor = createEditorWithCommands(view, mockCall)

    wysiwygAddColBefore(editor)

    expect(mockCall).toHaveBeenCalledOnce()
    expect(mockCall).toHaveBeenCalledWith(addColBeforeCommand.key)
    expect(focusSpy).toHaveBeenCalledOnce()
    view.destroy()
  })

  it('does nothing when editor is null', () => {
    wysiwygAddColBefore(null)
  })
})

describe('wysiwygAddColAfter', () => {
  it('calls addColAfterCommand via commandsCtx', () => {
    const view = createView('hello')
    const focusSpy = vi.spyOn(view, 'focus')
    const mockCall = vi.fn().mockReturnValue(true)
    const editor = createEditorWithCommands(view, mockCall)

    wysiwygAddColAfter(editor)

    expect(mockCall).toHaveBeenCalledOnce()
    expect(mockCall).toHaveBeenCalledWith(addColAfterCommand.key)
    expect(focusSpy).toHaveBeenCalledOnce()
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

describe('wysiwygToggleTaskItem', () => {
  it('toggles the checked attribute for a task list item DOM node', () => {
    const view = createTaskListView()
    const focusSpy = vi.spyOn(view, 'focus')
    const editor = createEditorWithCommands(view, vi.fn(), taskSchema)
    const taskItem = view.dom.querySelector('li[data-item-type="task"]') as HTMLElement

    const handled = wysiwygToggleTaskItem(editor, taskItem)

    expect(handled).toBe(true)
    expect(view.state.doc.child(0).child(0).attrs.checked).toBe(true)
    expect(focusSpy).toHaveBeenCalledOnce()
    view.destroy()
  })

  it('returns false when the target is not a task list item', () => {
    const view = createView('hello')
    const editor = createEditorWithCommands(view, vi.fn())
    const paragraph = view.dom.querySelector('p') as HTMLElement

    expect(wysiwygToggleTaskItem(editor, paragraph)).toBe(false)
    view.destroy()
  })
})

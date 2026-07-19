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
import { TextSelection } from '@milkdown/prose/state'
import { setBlockType, toggleMark, wrapIn } from '@milkdown/prose/commands'
import { wrapInList } from '@milkdown/prose/schema-list'
import type { EditorView } from '@milkdown/prose/view'
import type { Schema } from '@milkdown/prose/model'
import { INLINE_CODE_PLACEHOLDER } from './inlineCode'

function runEditorCommand(editor: Editor, runner: (view: EditorView, schema: Schema) => void) {
  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const schema = ctx.get(schemaCtx)
    runner(view, schema)
    view.focus()
  })
}

function toggleNamedMark(editor: Editor, markName: string) {
  runEditorCommand(editor, (view, schema) => {
    const mark = schema.marks[markName]
    if (!mark) return
    toggleMark(mark)(view.state, view.dispatch)
  })
}

function hasStoredOrActiveMark(view: EditorView, markName: string): boolean {
  const { state } = view
  const marks = state.storedMarks ?? state.selection.$from.marks()
  return marks.some((mark) => mark.type.name === markName)
}

function insertInlineCodePlaceholder(view: EditorView, schema: Schema) {
  const mark = schema.marks.inlineCode
  if (!mark) return

  const { from, to } = view.state.selection
  let tr = view.state.tr.insertText(INLINE_CODE_PLACEHOLDER, from, to)
  const end = from + INLINE_CODE_PLACEHOLDER.length
  tr = tr.addMark(from, end, mark.create())
  tr = tr.setSelection(TextSelection.create(tr.doc, from, end))
  tr.setStoredMarks([mark.create()])
  view.dispatch(tr)
}

function setHeading(editor: Editor, level: number) {
  runEditorCommand(editor, (view, schema) => {
    const heading = schema.nodes.heading
    if (!heading) return
    setBlockType(heading, { level })(view.state, view.dispatch)
  })
}

function wrapInNode(editor: Editor, nodeName: string, attrs?: Record<string, unknown>) {
  runEditorCommand(editor, (view, schema) => {
    const node = schema.nodes[nodeName]
    if (!node) return
    wrapIn(node, attrs)(view.state, view.dispatch)
  })
}

function wrapInListType(editor: Editor, listName: string) {
  runEditorCommand(editor, (view, schema) => {
    const list = schema.nodes[listName]
    if (!list) return
    wrapInList(list)(view.state, view.dispatch)
  })
}

export function wysiwygToggleBold(editor: Editor | null) {
  if (!editor) return
  toggleNamedMark(editor, 'strong')
}

export function wysiwygToggleItalic(editor: Editor | null) {
  if (!editor) return
  toggleNamedMark(editor, 'emphasis')
}

export function wysiwygToggleStrike(editor: Editor | null) {
  if (!editor) return
  toggleNamedMark(editor, 'strike_through')
}

export function wysiwygToggleUnderline(editor: Editor | null) {
  if (!editor) return
  toggleNamedMark(editor, 'underline')
}

export function wysiwygToggleInlineCode(editor: Editor | null) {
  if (!editor) return
  runEditorCommand(editor, (view, schema) => {
    if (!view.state.selection.empty || hasStoredOrActiveMark(view, 'inlineCode')) {
      const mark = schema.marks.inlineCode
      if (!mark) return
      toggleMark(mark)(view.state, view.dispatch)
      return
    }
    insertInlineCodePlaceholder(view, schema)
  })
}

export function wysiwygSetHeading(editor: Editor | null, level: 1 | 2 | 3) {
  if (!editor) return
  setHeading(editor, level)
}

export function wysiwygWrapBlockquote(editor: Editor | null) {
  if (!editor) return
  wrapInNode(editor, 'blockquote')
}

export function wysiwygWrapBulletList(editor: Editor | null) {
  if (!editor) return
  wrapInListType(editor, 'bullet_list')
}

export function wysiwygWrapOrderedList(editor: Editor | null) {
  if (!editor) return
  wrapInListType(editor, 'ordered_list')
}

export function wysiwygInsertCodeBlock(editor: Editor | null) {
  if (!editor) return
  runEditorCommand(editor, (view, schema) => {
    const codeBlock = schema.nodes.code_block
    if (!codeBlock) return
    setBlockType(codeBlock, { language: 'language' })(view.state, view.dispatch)
  })
}

export function wysiwygInsertTable(editor: Editor | null) {
  if (!editor) return
  editor.action((ctx) => {
    ctx.get(commandsCtx).call(insertTableCommand.key)
  })
}

function callGfmCommand(editor: Editor, cmd: { key: string }, payload?: unknown) {
  editor.action((ctx) => {
    const commands = ctx.get(commandsCtx)
    if (payload !== undefined) {
      commands.call(cmd.key, payload)
    } else {
      commands.call(cmd.key)
    }
  })
}

function getTableRowIndex(editor: Editor): number {
  let index = -1
  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const { $from } = view.state.selection
    for (let depth = $from.depth; depth > 0; depth--) {
      const node = $from.node(depth)
      if (node.type.name === 'table_row') {
        const parent = $from.node(depth - 1)
        for (let i = 0; i < parent.childCount; i++) {
          if (parent.child(i) === node) { index = i; break }
        }
        break
      }
    }
  })
  return index
}

function getTableColIndex(editor: Editor): number {
  let index = -1
  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const { $from } = view.state.selection
    for (let depth = $from.depth; depth > 0; depth--) {
      const node = $from.node(depth)
      if (node.type.name === 'table_cell' || node.type.name === 'table_header') {
        const parent = $from.node(depth - 1)
        for (let i = 0; i < parent.childCount; i++) {
          if (parent.child(i) === node) { index = i; break }
        }
        break
      }
    }
  })
  return index
}

export function wysiwygAddRowAfter(editor: Editor | null) {
  if (!editor) return
  callGfmCommand(editor, addRowAfterCommand)
}

export function wysiwygAddColAfter(editor: Editor | null) {
  if (!editor) return
  callGfmCommand(editor, addColAfterCommand)
}

export function wysiwygDeleteRow(editor: Editor | null) {
  if (!editor) return
  const index = getTableRowIndex(editor)
  if (index < 0) return
  callGfmCommand(editor, selectRowCommand, { index })
  callGfmCommand(editor, deleteSelectedCellsCommand)
}

export function wysiwygDeleteCol(editor: Editor | null) {
  if (!editor) return
  const index = getTableColIndex(editor)
  if (index < 0) return
  callGfmCommand(editor, selectColCommand, { index })
  callGfmCommand(editor, deleteSelectedCellsCommand)
}

export function wysiwygDeleteTable(editor: Editor | null) {
  if (!editor) return
  callGfmCommand(editor, selectTableCommand)
  callGfmCommand(editor, deleteSelectedCellsCommand)
}

export function wysiwygInsertLink(editor: Editor | null) {
  if (!editor) return
  const href = window.prompt('链接地址', 'https://')
  if (!href) return
  runEditorCommand(editor, (view, schema) => {
    const link = schema.marks.link
    if (!link) return
    toggleMark(link, { href })(view.state, view.dispatch)
  })
}

export function wysiwygSetColAlign(editor: Editor | null, alignment: 'left' | 'center' | 'right' = 'left') {
  if (!editor) return
  const index = getTableColIndex(editor)
  if (index < 0) return
  callGfmCommand(editor, selectColCommand, { index })
  callGfmCommand(editor, setAlignCommand, alignment)
}

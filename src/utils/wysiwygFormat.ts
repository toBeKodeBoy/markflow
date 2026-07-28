import type { CmdKey, Editor } from '@milkdown/core'
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
  setAlignCommand,
} from '@milkdown/preset-gfm'
import { TextSelection } from '@milkdown/prose/state'
import { setBlockType, toggleMark, wrapIn } from '@milkdown/prose/commands'
import { wrapInList } from '@milkdown/prose/schema-list'
import type { EditorView } from '@milkdown/prose/view'
import type { Mark, Schema } from '@milkdown/prose/model'
import { INLINE_CODE_PLACEHOLDER } from './inlineCode'
import { DEFAULT_LINK_TEXT, type LinkDraft } from './linkEditing'

const LINK_PLACEHOLDER_URL = 'url'

export interface WysiwygLinkSelection {
  from: number
  to: number
  text: string
  url: string
  title: string
  editingExistingLink: boolean
}

export interface WysiwygHighlightSelection {
  from: number
  to: number
  text: string
  empty: boolean
}

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

function findActiveLinkMarkRange(view: EditorView, schema: Schema): WysiwygLinkSelection | null {
  const link = schema.marks.link
  if (!link) return null

  const { selection, doc } = view.state
  const { from, to, empty, $from } = selection

  if (!empty) {
    const mark = link.isInSet(doc.resolve(from).marks())
    if (!mark) return null
    return {
      from,
      to,
      text: doc.textBetween(from, to, ''),
      url: mark.attrs.href ?? '',
      title: mark.attrs.title ?? '',
      editingExistingLink: true,
    }
  }

  const parent = $from.parent
  const parentStart = $from.start()
  let active: WysiwygLinkSelection | null = null

  parent.forEach((node, offset) => {
    if (active) return
    const mark = link.isInSet(node.marks)
    if (!mark) return
    const start = parentStart + offset
    const end = start + node.nodeSize
    if (from < start || from > end) return
    active = {
      from: start,
      to: end,
      text: doc.textBetween(start, end, ''),
      url: mark.attrs.href ?? '',
      title: mark.attrs.title ?? '',
      editingExistingLink: true,
    }
  })

  return active
}

function replaceTextAndMark(
  view: EditorView,
  linkMark: Mark,
  from: number,
  to: number,
  nextText: string,
) {
  let tr = view.state.tr.insertText(nextText, from, to)
  const end = from + nextText.length
  tr = tr.removeMark(from, end, linkMark.type)
  tr = tr.addMark(from, end, linkMark)
  tr = tr.setSelection(TextSelection.create(tr.doc, from, end))
  view.dispatch(tr)
}

function applyTextMark(
  view: EditorView,
  mark: Mark,
  from: number,
  to: number,
  nextText: string,
) {
  let tr = view.state.tr.insertText(nextText, from, to)
  const end = from + nextText.length
  tr = tr.removeMark(from, end, mark.type)
  tr = tr.addMark(from, end, mark)
  tr = tr.setSelection(TextSelection.create(tr.doc, from, end))
  view.dispatch(tr)
}

export function wysiwygApplyHighlight(
  editor: Editor | null,
  snapshot: WysiwygHighlightSelection,
  text: string,
) {
  if (!editor) return
  runEditorCommand(editor, (view, schema) => {
    const highlight = schema.marks.highlight
    if (!highlight) return
    const nextText = text.trim() || snapshot.text
    if (!nextText) return
    applyTextMark(view, highlight.create(), snapshot.from, snapshot.to, nextText)
  })
}

export function readWysiwygLinkSelection(editor: Editor | null): WysiwygLinkSelection | null {
  if (!editor) return null
  let snapshot: WysiwygLinkSelection | null = null

  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const schema = ctx.get(schemaCtx)
    const activeLink = findActiveLinkMarkRange(view, schema)
    if (activeLink) {
      snapshot = activeLink
      return
    }

    const { from, to, empty } = view.state.selection
    const selectedText = empty ? DEFAULT_LINK_TEXT : view.state.doc.textBetween(from, to, '')
    snapshot = {
      from,
      to,
      text: selectedText || DEFAULT_LINK_TEXT,
      url: '',
      title: '',
      editingExistingLink: false,
    }
  })

  return snapshot
}

export function readWysiwygHighlightSelection(editor: Editor | null): WysiwygHighlightSelection | null {
  if (!editor) return null
  let snapshot: WysiwygHighlightSelection | null = null

  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const { from, to, empty } = view.state.selection
    snapshot = {
      from,
      to,
      text: empty ? '' : view.state.doc.textBetween(from, to, ''),
      empty,
    }
  })

  return snapshot
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

export function wysiwygToggleHighlight(editor: Editor | null) {
  if (!editor) return
  toggleNamedMark(editor, 'highlight')
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

export function wysiwygInsertTaskList(editor: Editor | null) {
  if (!editor) return
  runEditorCommand(editor, (view, schema) => {
    const bulletList = schema.nodes.bullet_list
    const listItem = schema.nodes.list_item
    const paragraph = schema.nodes.paragraph
    if (!bulletList || !listItem || !paragraph) return

    const createTaskItem = () => listItem.create(
      { checked: false, listType: 'bullet', spread: 'false' },
      paragraph.create(),
    )

    const taskList = bulletList.create(null, [
      createTaskItem(),
      createTaskItem(),
      createTaskItem(),
    ])

    const { from, to } = view.state.selection
    let tr = view.state.tr.replaceRangeWith(from, to, taskList)
    const cursor = Math.min(from + 3, tr.doc.content.size)
    tr = tr.setSelection(TextSelection.create(tr.doc, cursor))
    view.dispatch(tr)
  })
}

export function wysiwygToggleTaskItem(editor: Editor | null, target: HTMLElement): boolean {
  if (!editor) return false
  const taskItem = target.closest('li[data-item-type="task"]') as HTMLElement | null
  if (!taskItem) return false

  let handled = false

  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const pos = view.posAtDOM(taskItem, 0)
    const $pos = view.state.doc.resolve(pos)

    for (let depth = $pos.depth; depth > 0; depth--) {
      const node = $pos.node(depth)
      if (node.type.name !== 'list_item' || node.attrs.checked == null) continue

      const nodePos = $pos.before(depth)
      const tr = view.state.tr.setNodeMarkup(nodePos, undefined, {
        ...node.attrs,
        checked: !node.attrs.checked,
      })
      view.dispatch(tr)
      view.focus()
      handled = true
      return
    }
  })

  return handled
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
  callGfmCommand(editor, insertTableCommand, { row: 3, col: 3 })
}

function callGfmCommand<T>(editor: Editor, cmd: { key: CmdKey<T> }, payload?: T) {
  editor.action((ctx) => {
    const commands = ctx.get(commandsCtx)
    if (payload !== undefined) {
      commands.call(cmd.key, payload)
    } else {
      commands.call(cmd.key)
    }
    ctx.get(editorViewCtx).focus()
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

export function wysiwygAddRowBefore(editor: Editor | null) {
  if (!editor) return
  callGfmCommand(editor, addRowBeforeCommand)
}

export function wysiwygAddRowAfter(editor: Editor | null) {
  if (!editor) return
  callGfmCommand(editor, addRowAfterCommand)
}

export function wysiwygAddColBefore(editor: Editor | null) {
  if (!editor) return
  callGfmCommand(editor, addColBeforeCommand)
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

export function wysiwygApplyLink(
  editor: Editor | null,
  snapshot: WysiwygLinkSelection,
  draft: LinkDraft,
) {
  if (!editor) return
  runEditorCommand(editor, (view, schema) => {
    const link = schema.marks.link
    if (!link) return

    const nextText = draft.text.trim() || snapshot.text || DEFAULT_LINK_TEXT
    const nextUrl = draft.url
    const nextTitle = draft.title.trim() || null
    const linkMark = link.create({ href: nextUrl, title: nextTitle })

    replaceTextAndMark(view, linkMark, snapshot.from, snapshot.to, nextText)
  })
}

export function wysiwygInsertLink(editor: Editor | null) {
  if (!editor) return
  const snapshot = readWysiwygLinkSelection(editor)
  if (!snapshot) return
  wysiwygApplyLink(editor, snapshot, {
    text: snapshot.text,
    url: snapshot.url || LINK_PLACEHOLDER_URL,
    title: snapshot.title,
  })
}

export function wysiwygSetColAlign(editor: Editor | null, alignment: 'left' | 'center' | 'right' = 'left') {
  if (!editor) return
  const index = getTableColIndex(editor)
  if (index < 0) return
  callGfmCommand(editor, selectColCommand, { index })
  callGfmCommand(editor, setAlignCommand, alignment)
}

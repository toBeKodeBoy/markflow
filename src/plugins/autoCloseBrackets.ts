import type { Ctx } from '@milkdown/ctx'
import { $prose } from '@milkdown/utils'
import type { Node as ProseNode } from '@milkdown/prose/model'
import type { Mark } from '@milkdown/prose/model'
import { Plugin, PluginKey, TextSelection } from '@milkdown/prose/state'
import type { EditorView } from '@milkdown/prose/view'

/** WYSIWYG 自动闭合字符对（开 → 闭） */
export const AUTO_CLOSE_PAIRS: Record<string, string> = {
  '(': ')',
  '{': '}',
  '`': '`',
}

/** 与 CodeMirror closeBrackets 默认 before 一致 */
const CLOSE_BEFORE = ')]}:;>'

export interface BacktickPairRange {
  openPos: number
  closePos: number
  content: string
}

export interface TextblockContext {
  blockStart: number
  blockText: string
  offset: number
}

export interface MarkRange {
  from: number
  to: number
}

export type InlineCodeArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'

export interface AutoCloseInputParams {
  text: string
  from: number
  to: number
  docText: string
  /** 处于 code 块 / 行内 code 等上下文时为 true，跳过自动补全 */
  skip?: boolean
}

export interface AutoCloseInputResult {
  handled: boolean
  insert?: string
  selection?: { anchor: number; head: number }
  /** 将字面量 `content` 转为 inlineCode mark（块内偏移） */
  convertInlineCode?: BacktickPairRange
  /** 输入 closing ` 完成未闭合 pair 并转为 inlineCode（块内偏移） */
  completeInlineCode?: { openPos: number; content: string }
}

export interface InlineCodeArrowActionParams {
  key: InlineCodeArrowKey
  pos: number
  range: MarkRange
  singleLine?: boolean
  atFirstLine?: boolean
  atLastLine?: boolean
  hasInlineCodeStoredMark?: boolean
}

export interface InlineCodeArrowAction {
  handled: boolean
  targetPos?: number
  clearStoredMarks?: boolean
}

/** 获取光标所在可编辑块上下文（块内偏移，非全文索引） */
export function getTextblockContext(doc: ProseNode, pos: number): TextblockContext | null {
  const safePos = Math.min(Math.max(pos, 1), Math.max(doc.content.size - 1, 1))
  const $pos = doc.resolve(safePos)
  if (!$pos.parent.inlineContent) return null

  const blockStart = $pos.start()
  const blockEnd = $pos.end()
  return {
    blockStart,
    blockText: doc.textBetween(blockStart, blockEnd),
    offset: pos - blockStart,
  }
}

/** 块内 pair 偏移 → 文档绝对位置 */
export function mapPairToDocPositions(
  blockStart: number,
  pair: BacktickPairRange,
): BacktickPairRange {
  return {
    openPos: blockStart + pair.openPos,
    closePos: blockStart + pair.closePos,
    content: pair.content,
  }
}

function hasMarkNamed(marks: readonly Mark[] | null | undefined, markName: string): boolean {
  return !!marks?.some((mark) => mark.type.name === markName)
}

export function findInlineCodeMarkRange(
  doc: ProseNode,
  pos: number,
  markName = 'inlineCode',
): MarkRange | null {
  const safePos = Math.min(Math.max(pos, 1), Math.max(doc.content.size - 1, 1))
  const $pos = doc.resolve(safePos)
  if (!$pos.parent.inlineContent) return null

  const blockStart = $pos.start()
  let cursor = blockStart
  let activeFrom: number | null = null
  let activeTo: number | null = null

  for (let index = 0; index < $pos.parent.childCount; index += 1) {
    const child = $pos.parent.child(index)
    const childFrom = cursor
    const childTo = cursor + child.nodeSize
    const hasInlineCode = child.isText && hasMarkNamed(child.marks, markName)

    if (hasInlineCode) {
      if (activeFrom === null) activeFrom = childFrom
      activeTo = childTo
    } else if (activeFrom !== null && activeTo !== null) {
      if (safePos >= activeFrom && safePos <= activeTo) return { from: activeFrom, to: activeTo }
      activeFrom = null
      activeTo = null
    }

    cursor = childTo
  }

  if (activeFrom !== null && activeTo !== null && safePos >= activeFrom && safePos <= activeTo) {
    return { from: activeFrom, to: activeTo }
  }

  return null
}

/** 查找闭合反引号对应的字面量 pair（块内偏移） */
export function findPlainBacktickPair(
  blockText: string,
  closeOffset: number,
): BacktickPairRange | null {
  if (blockText[closeOffset] !== '`') return null

  const previousBackticks: number[] = []
  for (let index = 0; index < closeOffset; index += 1) {
    if (blockText[index] === '`') previousBackticks.push(index)
  }
  if (previousBackticks.length % 2 === 0) return null

  const openOffset = previousBackticks[previousBackticks.length - 1]

  const content = blockText.slice(openOffset + 1, closeOffset)
  if (!content || /[`\n]/.test(content)) return null

  return { openPos: openOffset, closePos: closeOffset, content }
}

/** 查找光标前未闭合的字面量反引号 pair（块内偏移） */
export function findUnclosedBacktickBefore(
  blockText: string,
  cursorOffset: number,
): BacktickPairRange | null {
  const before = blockText.slice(0, cursorOffset)
  const previousBackticks: number[] = []
  for (let index = 0; index < before.length; index += 1) {
    if (before[index] === '`') previousBackticks.push(index)
  }
  if (previousBackticks.length % 2 === 0) return null

  const openOffset = previousBackticks[previousBackticks.length - 1]

  const content = blockText.slice(openOffset + 1, cursorOffset)
  if (!content || /[`\n]/.test(content)) return null

  return { openPos: openOffset, closePos: cursorOffset, content }
}

/** 光标位于 closing ` 上时，返回待转换 pair（块内偏移） */
export function findPendingPlainBacktickPair(
  blockText: string,
  cursorOffset: number,
): BacktickPairRange | null {
  const pair = findPlainBacktickPair(blockText, cursorOffset)
  if (pair && cursorOffset === pair.closePos) {
    return pair
  }
  return null
}

/** 纯函数：计算自动闭合插入与光标位置（块内偏移，便于单测） */
export function computeAutoCloseTextInput(params: AutoCloseInputParams): AutoCloseInputResult {
  const { text, from, to, docText, skip } = params
  const close = AUTO_CLOSE_PAIRS[text]
  if (!close || skip) return { handled: false }

  const nextChar = docText.slice(to, to + 1)

  if (nextChar === close) {
    if (text === '`') {
      const pair = findPlainBacktickPair(docText, to)
      if (pair) {
        return { handled: true, convertInlineCode: pair }
      }
    }
    return {
      handled: true,
      insert: '',
      selection: { anchor: to + 1, head: to + 1 },
    }
  }

  if (from === to) {
    if (nextChar && !/\s/.test(nextChar) && !CLOSE_BEFORE.includes(nextChar)) {
      return { handled: false }
    }
    if (text === '`') {
      const unclosed = findUnclosedBacktickBefore(docText, from)
      if (unclosed) {
        return {
          handled: true,
          completeInlineCode: { openPos: unclosed.openPos, content: unclosed.content },
        }
      }
      // 仅插入 opening `，不自动补 closing，便于逐字输入行内代码
      return {
        handled: true,
        insert: '`',
        selection: { anchor: from + 1, head: from + 1 },
      }
    }
    return {
      handled: true,
      insert: text + close,
      selection: { anchor: from + 1, head: from + 1 },
    }
  }

  const selected = docText.slice(from, to)
  return {
    handled: true,
    insert: text + selected + close,
    selection: { anchor: from + 1, head: from + 1 + selected.length },
  }
}

export function computeInlineCodeArrowAction(params: InlineCodeArrowActionParams): InlineCodeArrowAction {
  const { key, pos, range, singleLine, atFirstLine, atLastLine, hasInlineCodeStoredMark } = params

  if (key === 'ArrowLeft') return { handled: false }
  if (key === 'ArrowRight') {
    if (pos >= range.to && hasInlineCodeStoredMark) {
      return { handled: true, targetPos: range.to, clearStoredMarks: true }
    }
    return { handled: false }
  }

  if (key === 'ArrowUp') {
    if (singleLine || atFirstLine) {
      return { handled: true, targetPos: range.from, clearStoredMarks: true }
    }
    return { handled: false }
  }

  if (singleLine || atLastLine) {
    return { handled: true, targetPos: range.to, clearStoredMarks: true }
  }
  return { handled: false }
}

function isInCodeContext(view: EditorView, from: number): boolean {
  const $from = view.state.doc.resolve(from)
  if ($from.parent.type.spec.code) return true

  const marks = view.state.storedMarks ?? $from.marks()
  return marks.some((mark) => mark.type.name === 'inlineCode')
}

function isInInlineCodeContext(view: EditorView, pos: number): boolean {
  const { state } = view
  const $pos = state.doc.resolve(pos)
  if (state.storedMarks !== null) return hasMarkNamed(state.storedMarks, 'inlineCode')
  if (hasMarkNamed($pos.marks(), 'inlineCode')) return true
  if ($pos.nodeBefore?.isText && hasMarkNamed($pos.nodeBefore.marks, 'inlineCode')) return true
  if ($pos.nodeAfter?.isText && hasMarkNamed($pos.nodeAfter.marks, 'inlineCode')) return true
  return false
}

function clearInlineCodeStoredMarks(view: EditorView) {
  const { state } = view
  const nextStoredMarks = (state.storedMarks ?? state.selection.$from.marks()).filter(
    (mark) => mark.type.name !== 'inlineCode',
  )
  return nextStoredMarks
}

function readInlineCodeLineContext(
  view: EditorView,
  pos: number,
  range: MarkRange,
): Pick<InlineCodeArrowActionParams, 'singleLine' | 'atFirstLine' | 'atLastLine'> {
  try {
    const current = view.coordsAtPos(pos)
    const start = view.coordsAtPos(range.from)
    const end = view.coordsAtPos(range.to)
    const tolerance = 2
    const singleLine = Math.abs(start.top - end.top) <= tolerance
    return {
      singleLine,
      atFirstLine: Math.abs(current.top - start.top) <= tolerance,
      atLastLine: Math.abs(current.top - end.top) <= tolerance,
    }
  } catch {
    return { singleLine: true, atFirstLine: true, atLastLine: true }
  }
}

function handleInlineCodeArrowExit(view: EditorView, event: KeyboardEvent): boolean {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return false
  const { state } = view
  if (!state.selection.empty) return false

  const pos = state.selection.from
  if (!isInInlineCodeContext(view, pos)) return false

  const range = findInlineCodeMarkRange(state.doc, pos)
  if (!range) return false

  const action = computeInlineCodeArrowAction({
    key: event.key as InlineCodeArrowKey,
    pos,
    range,
    ...readInlineCodeLineContext(view, pos, range),
    hasInlineCodeStoredMark: hasMarkNamed(state.storedMarks ?? state.selection.$from.marks(), 'inlineCode'),
  })
  if (!action.handled || action.targetPos === undefined) return false

  const tr = state.tr.setSelection(TextSelection.create(state.doc, action.targetPos))
  if (action.clearStoredMarks) tr.setStoredMarks(clearInlineCodeStoredMarks(view))
  view.dispatch(tr.scrollIntoView())
  return true
}

function applyCompleteInlineCode(
  view: EditorView,
  blockStart: number,
  complete: { openPos: number; content: string },
): boolean {
  const { state } = view
  const markType = state.schema.marks.inlineCode
  if (!markType) return false

  const absOpen = blockStart + complete.openPos
  let tr = state.tr.delete(absOpen, absOpen + 1)
  const end = absOpen + complete.content.length
  tr = tr.addMark(absOpen, end, markType.create())
  tr.setSelection(TextSelection.create(tr.doc, end))
  tr.setStoredMarks([])
  view.dispatch(tr)
  return true
}

function applyInlineCodeConversion(
  view: EditorView,
  pair: BacktickPairRange,
  trailingText = '',
): boolean {
  const { state } = view
  const markType = state.schema.marks.inlineCode
  if (!markType) return false

  const { openPos, closePos, content } = pair
  let tr = state.tr
  tr = tr.delete(closePos, closePos + 1)
  tr = tr.delete(openPos, openPos + 1)
  const end = openPos + content.length
  tr = tr.addMark(openPos, end, markType.create())
  if (trailingText) {
    tr = tr.insertText(trailingText, end, end)
    tr.setSelection(TextSelection.create(tr.doc, end + trailingText.length))
  } else {
    tr.setSelection(TextSelection.create(tr.doc, end))
  }
  view.dispatch(tr)
  return true
}

function handleAutoCloseInput(
  view: EditorView,
  from: number,
  to: number,
  text: string,
): boolean {
  const { state } = view
  const inCode = isInCodeContext(view, from)
  const blockCtx = getTextblockContext(state.doc, from)
  if (!blockCtx) return false

  const toOffset = to - blockCtx.blockStart
  const { blockStart, blockText, offset: fromOffset } = blockCtx

  if (!inCode && text !== '`') {
    const pending = findPendingPlainBacktickPair(blockText, fromOffset)
    if (pending) {
      return applyInlineCodeConversion(
        view,
        mapPairToDocPositions(blockStart, pending),
        text,
      )
    }
  }

  const result = computeAutoCloseTextInput({
    text,
    from: fromOffset,
    to: toOffset,
    docText: blockText,
    skip: inCode,
  })

  if (!result.handled) return false

  if (result.completeInlineCode) {
    return applyCompleteInlineCode(
      view,
      blockStart,
      result.completeInlineCode,
    )
  }

  if (result.convertInlineCode) {
    return applyInlineCodeConversion(
      view,
      mapPairToDocPositions(blockStart, result.convertInlineCode),
    )
  }

  if (!result.selection) return false

  if (result.insert) {
    const tr = state.tr.insertText(result.insert, from, to)
    const anchor = blockStart + result.selection.anchor
    const head = blockStart + result.selection.head
    tr.setSelection(TextSelection.create(tr.doc, anchor, head))
    view.dispatch(tr)
    return true
  }

  view.dispatch(
    state.tr.setSelection(
      TextSelection.create(
        state.doc,
        blockStart + result.selection.anchor,
        blockStart + result.selection.head,
      ),
    ),
  )
  return true
}

/** 创建 ProseMirror 插件实例（供 Milkdown 与单测使用） */
export function createAutoCloseBracketsProsePlugin(): Plugin {
  return new Plugin({
    key: new PluginKey('MARKFLOW_AUTO_CLOSE_BRACKETS'),
    props: {
      handleKeyDown(view, event) {
        return handleInlineCodeArrowExit(view, event)
      },
      handleTextInput(view, from, to, text) {
        return handleAutoCloseInput(view, from, to, text)
      },
    },
  })
}

/** WYSIWYG：输入 ( / { / ` 自动补全闭合字符；反引号 pair 转为行内 code */
export const autoCloseBracketsPlugin = $prose((_ctx: Ctx) => {
  return createAutoCloseBracketsProsePlugin()
})

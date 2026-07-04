import type { Ctx } from '@milkdown/ctx'
import { $prose } from '@milkdown/utils'
import type { Node as ProseNode } from '@milkdown/prose/model'
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

/** 查找闭合反引号对应的字面量 pair（块内偏移） */
export function findPlainBacktickPair(
  blockText: string,
  closeOffset: number,
): BacktickPairRange | null {
  if (blockText[closeOffset] !== '`') return null

  let openOffset = closeOffset - 1
  while (openOffset >= 0 && blockText[openOffset] !== '`') {
    if (blockText[openOffset] === '\n') return null
    openOffset--
  }
  if (openOffset < 0) return null

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
  const openOffset = before.lastIndexOf('`')
  if (openOffset < 0) return null

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

function isInCodeContext(view: EditorView, from: number): boolean {
  const $from = view.state.doc.resolve(from)
  if ($from.parent.type.spec.code) return true

  const marks = view.state.storedMarks ?? $from.marks()
  return marks.some((mark) => mark.type.name === 'inlineCode')
}

function applyCompleteInlineCode(
  view: EditorView,
  blockStart: number,
  from: number,
  to: number,
  complete: { openPos: number; content: string },
): boolean {
  const { state } = view
  const markType = state.schema.marks.inlineCode
  if (!markType) return false

  const absOpen = blockStart + complete.openPos
  let tr = state.tr.insertText('`', from, to)
  const absClose = from + 1
  tr = tr.delete(absClose, absClose + 1)
  tr = tr.delete(absOpen, absOpen + 1)
  const end = absOpen + complete.content.length
  tr = tr.addMark(absOpen, end, markType.create())
  tr.setSelection(TextSelection.create(tr.doc, end))
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
      from,
      to,
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

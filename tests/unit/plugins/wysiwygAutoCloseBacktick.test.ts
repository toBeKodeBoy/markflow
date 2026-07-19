import { describe, it, expect, vi } from 'vitest'
import { Schema } from '@milkdown/prose/model'
import { EditorState, TextSelection } from '@milkdown/prose/state'
import { EditorView } from '@milkdown/prose/view'
import {
  AUTO_CLOSE_PAIRS,
  computeAutoCloseTextInput,
  computeInlineCodeArrowAction,
  createAutoCloseBracketsProsePlugin,
  findInlineCodeMarkRange,
  findPendingPlainBacktickPair,
  findPlainBacktickPair,
  getTextblockContext,
  mapPairToDocPositions,
} from '../../../src/plugins/autoCloseBrackets'

const schema = new Schema({
  nodes: {
    doc: {
      content: 'block+',
      toDOM: () => ['div', 0] as const,
    },
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

function createView(doc: ReturnType<typeof schema.node>): EditorView {
  const parent = document.createElement('div')
  document.body.appendChild(parent)
  const state = EditorState.create({
    doc,
    plugins: [createAutoCloseBracketsProsePlugin()],
  })
  return new EditorView(parent, { state })
}

describe('WYSIWYG auto-close backtick', () => {
  it('includes backtick in auto-close pairs', () => {
    expect(AUTO_CLOSE_PAIRS['`']).toBe('`')
  })

  it('inserts opening backtick only (no auto-close pair)', () => {
    const result = computeAutoCloseTextInput({
      text: '`',
      from: 5,
      to: 5,
      docText: 'hello world',
    })
    expect(result).toEqual({
      handled: true,
      insert: '`',
      selection: { anchor: 6, head: 6 },
    })
  })

  it('completes unclosed backtick pair when typing closing backtick', () => {
    const result = computeAutoCloseTextInput({
      text: '`',
      from: 6,
      to: 6,
      docText: '`hello',
    })
    expect(result).toEqual({
      handled: true,
      completeInlineCode: { openPos: 0, content: 'hello' },
    })
  })

  it('wraps selected text with backticks', () => {
    const result = computeAutoCloseTextInput({
      text: '`',
      from: 0,
      to: 5,
      docText: 'hello world',
    })
    expect(result).toEqual({
      handled: true,
      insert: '`hello`',
      selection: { anchor: 1, head: 6 },
    })
  })

  it('requests inline code conversion when typing closing backtick over a pair', () => {
    const result = computeAutoCloseTextInput({
      text: '`',
      from: 5,
      to: 5,
      docText: '`demo`',
    })
    expect(result).toEqual({
      handled: true,
      convertInlineCode: { openPos: 0, closePos: 5, content: 'demo' },
    })
  })

  it('skips over empty backtick pair without conversion', () => {
    const result = computeAutoCloseTextInput({
      text: '`',
      from: 1,
      to: 1,
      docText: '``',
    })
    expect(result).toEqual({
      handled: true,
      insert: '',
      selection: { anchor: 2, head: 2 },
    })
  })

  it('does not auto-close inside code context', () => {
    const result = computeAutoCloseTextInput({
      text: '`',
      from: 0,
      to: 0,
      docText: 'code',
      skip: true,
    })
    expect(result).toEqual({ handled: false })
  })

  it('inserts a literal closing backtick when previous content already contains a backtick', () => {
    const result = computeAutoCloseTextInput({
      text: '`',
      from: 4,
      to: 4,
      docText: '`a`b',
    })
    expect(result).toEqual({
      handled: true,
      insert: '`',
      selection: { anchor: 5, head: 5 },
    })
  })
})

describe('findPlainBacktickPair', () => {
  it('finds valid pair at close position', () => {
    expect(findPlainBacktickPair('prefix `demo` suffix', 12)).toEqual({
      openPos: 7,
      closePos: 12,
      content: 'demo',
    })
  })

  it('rejects empty content', () => {
    expect(findPlainBacktickPair('``', 1)).toBeNull()
  })

  it('rejects multiline content', () => {
    expect(findPlainBacktickPair('`a\nb`', 4)).toBeNull()
  })

  it('rejects content containing backticks', () => {
    expect(findPlainBacktickPair('`a`b`', 4)).toBeNull()
  })
})

describe('findPendingPlainBacktickPair', () => {
  it('does not match when cursor is inside content', () => {
    expect(findPendingPlainBacktickPair('`demo`', 4)).toBeNull()
  })

  it('finds pair when cursor is on closing backtick', () => {
    expect(findPendingPlainBacktickPair('`demo`', 5)).toEqual({
      openPos: 0,
      closePos: 5,
      content: 'demo',
    })
  })
})

describe('getTextblockContext', () => {
  it('maps ProseMirror positions to block-local offsets', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('`abc`')]),
    ])
    const ctx = getTextblockContext(doc, 5)
    expect(ctx).not.toBeNull()
    expect(ctx!.blockText).toBe('`abc`')
    // pos 5 = 'c'（blockStart=1, offset=4 对应块内 index 3）
    expect(ctx!.offset).toBe(4)
    expect(findPlainBacktickPair(ctx!.blockText, 4)).toEqual({
      openPos: 0,
      closePos: 4,
      content: 'abc',
    })
    expect(mapPairToDocPositions(ctx!.blockStart, { openPos: 0, closePos: 4, content: 'abc' })).toEqual({
      openPos: 1,
      closePos: 5,
      content: 'abc',
    })
  })
})

describe('autoCloseBracketsPlugin integration', () => {
  it('converts `abc` literals to inlineCode mark when typing closing backtick', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('`abc`')]),
    ])
    const view = createView(doc)
    const closePos = 5
    const handled = view.someProp('handleTextInput', (f) =>
      f(view, closePos, closePos, '`'),
    )
    expect(handled).toBe(true)
    const blockStart = 1
    const text = view.state.doc.textBetween(blockStart, blockStart + 3)
    expect(text).toBe('abc')
    const marks = view.state.doc.resolve(blockStart).marks()
    expect(marks.some((m) => m.type.name === 'inlineCode')).toBe(true)
    view.destroy()
  })

  it('completes an unclosed backtick without leaving a trailing literal backtick', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('`abc')]),
    ])
    const view = createView(doc)
    const closePos = 5
    const handled = view.someProp('handleTextInput', (f) =>
      f(view, closePos, closePos, '`'),
    )

    expect(handled).toBe(true)
    expect(view.state.doc.textContent).toBe('abc')
    const marks = view.state.doc.resolve(1).marks()
    expect(marks.some((m) => m.type.name === 'inlineCode')).toBe(true)
    expect(view.state.selection.from).toBe(4)
    expect(view.state.storedMarks).toEqual([])
    view.destroy()
  })

  it('ArrowLeft inside inlineCode should use ProseMirror default one-step movement', () => {
    const mark = schema.marks.inlineCode.create()
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('abc', [mark])]),
    ])
    const view = createView(doc)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 2)))

    let handled = false
    view.someProp('handleKeyDown', (f) => {
      handled = f(view, new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
      return handled
    })

    expect(handled).toBe(false)
    expect(view.state.selection.from).toBe(2)
    view.destroy()
  })

  it('ArrowRight inside inlineCode should use ProseMirror default one-step movement', () => {
    const mark = schema.marks.inlineCode.create()
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('abc', [mark])]),
    ])
    const view = createView(doc)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 2)))

    let handled = false
    view.someProp('handleKeyDown', (f) => {
      handled = f(view, new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      return handled
    })

    expect(handled).toBe(false)
    expect(view.state.selection.from).toBe(2)
    view.destroy()
  })

  it('ArrowUp in single-line inlineCode should move cursor to the left side', () => {
    const mark = schema.marks.inlineCode.create()
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('abc', [mark])]),
    ])
    const view = createView(doc)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 2)))

    let handled = false
    view.someProp('handleKeyDown', (f) => {
      handled = f(view, new KeyboardEvent('keydown', { key: 'ArrowUp' }))
      return handled
    })

    expect(handled).toBe(true)
    expect(view.state.selection.from).toBe(1)
    expect(view.state.storedMarks).toEqual([])
    view.destroy()
  })

  it('ArrowDown in single-line inlineCode should move cursor to the right side', () => {
    const mark = schema.marks.inlineCode.create()
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('abc', [mark])]),
    ])
    const view = createView(doc)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 2)))

    let handled = false
    view.someProp('handleKeyDown', (f) => {
      handled = f(view, new KeyboardEvent('keydown', { key: 'ArrowDown' }))
      return handled
    })

    expect(handled).toBe(true)
    expect(view.state.selection.from).toBe(4)
    expect(view.state.storedMarks).toEqual([])
    view.destroy()
  })

  it('ArrowRight should exit inlineCode at the right edge', () => {
    const mark = schema.marks.inlineCode.create()
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('abc', [mark]), schema.text('tail')]),
    ])
    const view = createView(doc)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 4)))
    const dispatchSpy = vi.spyOn(view, 'dispatch')

    let handled = false
    view.someProp('handleKeyDown', (f) => {
      handled = f(view, new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      return handled
    })

    expect(handled).toBe(true)
    expect(dispatchSpy).toHaveBeenCalledTimes(1)
    expect(view.state.selection.from).toBe(4)
    expect(view.state.storedMarks).toEqual([])

    handled = true
    view.someProp('handleKeyDown', (f) => {
      handled = f(view, new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      return handled
    })
    expect(handled).toBe(false)
    expect(dispatchSpy).toHaveBeenCalledTimes(1)
    dispatchSpy.mockRestore()
    view.destroy()
  })

  it('does not intercept ArrowLeft at the left edge of inlineCode', () => {
    const mark = schema.marks.inlineCode.create()
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('head'), schema.text('abc', [mark])]),
    ])
    const view = createView(doc)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 5)))

    let handled = false
    view.someProp('handleKeyDown', (f) => {
      handled = f(view, new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
      return handled
    })

    expect(handled).toBe(false)
    expect(view.state.selection.from).toBe(5)
    view.destroy()
  })

  it('does not intercept arrow keys outside inlineCode', () => {
    const mark = schema.marks.inlineCode.create()
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('a'), schema.text('bc', [mark])]),
    ])
    const view = createView(doc)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1)))

    let handled = false
    view.someProp('handleKeyDown', (f) => {
      handled = f(view, new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      return handled
    })

    expect(handled).toBe(false)
    expect(view.state.selection.from).toBe(1)
    view.destroy()
  })
})

describe('computeInlineCodeArrowAction', () => {
  it('lets left and right arrows move normally inside inlineCode', () => {
    expect(computeInlineCodeArrowAction({ key: 'ArrowLeft', pos: 2, range: { from: 1, to: 4 } })).toEqual({
      handled: false,
    })
    expect(computeInlineCodeArrowAction({ key: 'ArrowRight', pos: 2, range: { from: 1, to: 4 } })).toEqual({
      handled: false,
    })
  })

  it('exits single-line inlineCode vertically at both sides', () => {
    expect(
      computeInlineCodeArrowAction({
        key: 'ArrowUp',
        pos: 2,
        range: { from: 1, to: 4 },
        singleLine: true,
      }),
    ).toEqual({ handled: true, targetPos: 1, clearStoredMarks: true })
    expect(
      computeInlineCodeArrowAction({
        key: 'ArrowDown',
        pos: 2,
        range: { from: 1, to: 4 },
        singleLine: true,
      }),
    ).toEqual({ handled: true, targetPos: 4, clearStoredMarks: true })
  })

  it('only clears inlineCode stored marks at the right edge', () => {
    expect(
      computeInlineCodeArrowAction({
        key: 'ArrowRight',
        pos: 4,
        range: { from: 1, to: 4 },
        hasInlineCodeStoredMark: true,
      }),
    ).toEqual({ handled: true, targetPos: 4, clearStoredMarks: true })
  })
})

describe('findInlineCodeMarkRange', () => {
  it('finds the full inlineCode mark range around the cursor', () => {
    const mark = schema.marks.inlineCode.create()
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('x'), schema.text('abc', [mark]), schema.text('y')]),
    ])

    expect(findInlineCodeMarkRange(doc, 3, 'inlineCode')).toEqual({ from: 2, to: 5 })
  })
})

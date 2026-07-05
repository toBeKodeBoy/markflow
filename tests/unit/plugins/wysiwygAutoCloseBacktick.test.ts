import { describe, it, expect } from 'vitest'
import { Schema } from '@milkdown/prose/model'
import { EditorState, TextSelection } from '@milkdown/prose/state'
import { EditorView } from '@milkdown/prose/view'
import {
  AUTO_CLOSE_PAIRS,
  computeAutoCloseTextInput,
  createAutoCloseBracketsProsePlugin,
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
})

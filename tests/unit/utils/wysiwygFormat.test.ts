import { describe, expect, it } from 'vitest'
import type { Editor } from '@milkdown/core'
import { editorViewCtx, schemaCtx } from '@milkdown/core'
import { Schema } from '@milkdown/prose/model'
import { EditorState, TextSelection } from '@milkdown/prose/state'
import { EditorView } from '@milkdown/prose/view'
import { wysiwygToggleInlineCode } from '../../../src/utils/wysiwygFormat'

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

function createView(text: string): EditorView {
  const parent = document.createElement('div')
  document.body.appendChild(parent)
  const doc = schema.node('doc', null, [schema.node('paragraph', null, text ? [schema.text(text)] : [])])
  return new EditorView(parent, {
    state: EditorState.create({ doc }),
  })
}

function createEditor(view: EditorView): Editor {
  return {
    action: (runner: (ctx: { get: (key: unknown) => unknown }) => void) => {
      runner({
        get: (key: unknown) => {
          if (key === editorViewCtx) return view
          if (key === schemaCtx) return schema
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

    wysiwygToggleInlineCode(createEditor(view))

    expect(view.state.doc.textContent).toBe('codehello')
    expect(view.state.selection.from).toBe(1)
    expect(view.state.selection.to).toBe(5)
    const marks = view.state.doc.resolve(1).marks()
    expect(marks.some((mark) => mark.type.name === 'inlineCode')).toBe(true)
    view.destroy()
  })

})

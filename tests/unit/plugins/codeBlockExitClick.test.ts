import { describe, it, expect } from 'vitest'
import { Schema } from '@milkdown/prose/model'
import { EditorState, TextSelection } from '@milkdown/prose/state'
import { EditorView } from '@milkdown/prose/view'
import { createCodeBlockExitProsePlugin } from '../../../src/plugins/codeBlockLabel'

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
    code_block: {
      group: 'block',
      code: true,
      content: 'text*',
      marks: '',
      attrs: { language: { default: '' } },
      toDOM: () => ['pre', ['code', 0]] as const,
      parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' }],
    },
    text: { group: 'inline' },
  },
})

function createView(doc: ReturnType<typeof schema.node>) {
  const parent = document.createElement('div')
  document.body.appendChild(parent)
  const plugin = createCodeBlockExitProsePlugin()
  const state = EditorState.create({
    doc,
    selection: TextSelection.create(doc, 1),
    plugins: [plugin],
  })
  return { view: new EditorView(parent, { state }), plugin }
}

function createCodeBlockBodyMouseDown(): MouseEvent {
  const target = document.createElement('code')
  target.className = 'code-block-editable language-js'
  const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'target', { configurable: true, value: target })
  return event
}

describe('codeBlockExitPlugin click exit', () => {
  it('点击中间代码块时，应把光标移到代码块后已有段落', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('before')]),
      schema.node('code_block', { language: 'js' }, [schema.text('const x = 1;')]),
      schema.node('paragraph', null, [schema.text('after')]),
    ])
    const { view, plugin } = createView(doc)
    const codeBlock = doc.child(1)
    const nodePos = doc.child(0).nodeSize
    const clickEvent = createCodeBlockBodyMouseDown()

    const handled = plugin.props.handleClickOn?.(view, nodePos, codeBlock, nodePos, clickEvent, true) ?? false

    expect(handled).toBe(true)
    expect(view.state.selection.from).toBe(nodePos + codeBlock.nodeSize + 1)
    expect(view.state.doc.childCount).toBe(3)
    view.destroy()
  })

  it('点击文末代码块时，应补段落并把光标移出代码块', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('before')]),
      schema.node('code_block', { language: 'js' }, [schema.text('const x = 1;')]),
    ])
    const { view, plugin } = createView(doc)
    const codeBlock = doc.child(1)
    const nodePos = doc.child(0).nodeSize
    const clickEvent = createCodeBlockBodyMouseDown()

    const handled = plugin.props.handleClickOn?.(view, nodePos, codeBlock, nodePos, clickEvent, true) ?? false

    expect(handled).toBe(true)
    expect(view.state.doc.childCount).toBe(3)
    expect(view.state.doc.lastChild?.type.name).toBe('paragraph')
    expect(view.state.selection.from).toBe(view.state.doc.content.size - 1)
    view.destroy()
  })
})

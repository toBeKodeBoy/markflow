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

function createArrowDownEvent(): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
}

describe('codeBlockExitPlugin 交互边界', () => {
  it('不再注册 handleClickOn：点击代码块不得强制把光标移出到下一行（回归守护）', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('before')]),
      schema.node('code_block', { language: 'js' }, [schema.text('const x = 1;')]),
      schema.node('paragraph', null, [schema.text('after')]),
    ])
    const { view, plugin } = createView(doc)

    expect(plugin.props.handleClickOn).toBeUndefined()

    view.destroy()
  })

  it('保留键盘退出：代码块末行按 ArrowDown，光标移到代码块后已有段落', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('before')]),
      schema.node('code_block', { language: 'js' }, [schema.text('const x = 1;')]),
      schema.node('paragraph', null, [schema.text('after')]),
    ])
    const { view, plugin } = createView(doc)
    const nodePos = doc.child(0).nodeSize
    const codeBlockEnd = nodePos + doc.child(1).nodeSize - 1

    const selection = TextSelection.create(doc, codeBlockEnd)
    const tr = view.state.tr.setSelection(selection)
    view.dispatch(tr)

    const handled = plugin.props.handleKeyDown?.(view, createArrowDownEvent()) ?? false

    expect(handled).toBe(true)
    expect(view.state.doc.childCount).toBe(3)
    // TextSelection.near 在 block 边界会推进到段落首字符（afterPos + 1）
    const afterPos = nodePos + doc.child(1).nodeSize
    expect(view.state.selection.from).toBe(afterPos + 1)
    expect(view.state.selection.$from.parent.type.name).toBe('paragraph')
    view.destroy()
  })

  it('保留键盘退出：文末代码块按 ArrowDown，补段落并把光标移出', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('before')]),
      schema.node('code_block', { language: 'js' }, [schema.text('const x = 1;')]),
    ])
    const { view, plugin } = createView(doc)
    const nodePos = doc.child(0).nodeSize
    const codeBlockEnd = nodePos + doc.child(1).nodeSize - 1

    const selection = TextSelection.create(doc, codeBlockEnd)
    const tr = view.state.tr.setSelection(selection)
    view.dispatch(tr)

    const handled = plugin.props.handleKeyDown?.(view, createArrowDownEvent()) ?? false

    expect(handled).toBe(true)
    expect(view.state.doc.childCount).toBe(3)
    expect(view.state.doc.lastChild?.type.name).toBe('paragraph')
    view.destroy()
  })
})

import { describe, it, expect } from 'vitest'
import { createCodeBlockExitProsePlugin, shouldStopCodeBlockEvent } from '../../../src/plugins/codeBlockLabel'
import { Schema } from '@milkdown/prose/model'
import { EditorState, TextSelection } from '@milkdown/prose/state'
import { EditorView } from '@milkdown/prose/view'

function createMouseEvent(target: HTMLElement): MouseEvent {
  const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'target', { configurable: true, value: target })
  return event
}

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

describe('shouldStopCodeBlockEvent', () => {
  it('语言栏与复制按钮点击应被拦截', () => {
    const wrapper = document.createElement('div')
    wrapper.className = 'milkdown-code-block'
    const content = document.createElement('code')
    content.className = 'code-block-editable'
    const actions = document.createElement('div')
    actions.className = 'code-block-actions'
    const copyBtn = document.createElement('button')
    copyBtn.className = 'code-copy-btn'
    actions.appendChild(copyBtn)
    wrapper.appendChild(actions)
    wrapper.appendChild(content)

    expect(shouldStopCodeBlockEvent(createMouseEvent(copyBtn), content, wrapper)).toBe(true)
  })

  it('高亮层与普通 wrapper 区域点击不应被拦截', () => {
    const wrapper = document.createElement('div')
    wrapper.className = 'milkdown-code-block'
    const content = document.createElement('code')
    content.className = 'code-block-editable'
    const highlight = document.createElement('code')
    highlight.className = 'code-block-highlight'
    const pre = document.createElement('pre')
    pre.appendChild(highlight)
    wrapper.appendChild(pre)
    wrapper.appendChild(content)

    expect(shouldStopCodeBlockEvent(createMouseEvent(highlight), content, wrapper)).toBe(false)
    expect(shouldStopCodeBlockEvent(createMouseEvent(pre), content, wrapper)).toBe(false)
  })

  it('真实命中的 editable 层点击应允许触发退出', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('before')]),
      schema.node('code_block', { language: 'js' }, [schema.text('const x = 1;')]),
      schema.node('paragraph', null, [schema.text('after')]),
    ])
    const { view, plugin } = createView(doc)
    const codeBlock = doc.child(1)
    const nodePos = doc.child(0).nodeSize
    const editable = document.createElement('code')
    editable.className = 'code-block-editable language-js'
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
    Object.defineProperty(clickEvent, 'target', { configurable: true, value: editable })

    const handled = plugin.props.handleClickOn?.(view, nodePos, codeBlock, nodePos, clickEvent, true) ?? false

    expect(handled).toBe(true)
    expect(view.state.selection.from).toBe(nodePos + codeBlock.nodeSize + 1)
    view.destroy()
  })
})

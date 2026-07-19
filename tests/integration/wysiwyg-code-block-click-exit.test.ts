import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { EditorView } from '@milkdown/prose/view'
import { editorViewCtx } from '@milkdown/core'
import { mountWysiwygEditor } from '../helpers/mountWysiwygEditor'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('WysiwygEditor code block click exit', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('点击代码块空白后输入文本，应在代码块外新增段落', async () => {
    const { wrapper, prose, store } = await mountWysiwygEditor('```js\nconst x = 1;\n```')

    const editable = prose.querySelector('.code-block-editable')
    expect(editable).toBeTruthy()

    await flushPromises()
    await wait(50)

    const editor = (wrapper.vm as { editor?: { action: (runner: (ctx: unknown) => void) => void } }).editor
    let view: EditorView | undefined
    editor?.action((ctx) => {
      view = (ctx as { get: (value: typeof editorViewCtx) => EditorView }).get(editorViewCtx)
    })

    expect(view).toBeTruthy()

    let codeBlockPos = -1
    let codeBlockNode: ReturnType<EditorView['state']['doc']['nodeAt']> | null = null
    view!.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'code_block') return true
      codeBlockPos = pos
      codeBlockNode = node
      return false
    })
    expect(codeBlockPos).toBeGreaterThanOrEqual(0)
    expect(codeBlockNode).toBeTruthy()

    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
    Object.defineProperty(clickEvent, 'target', { configurable: true, value: editable })
    let clickHandled = false
    view!.someProp('handleClickOn', (handler) => {
      clickHandled = handler(view!, codeBlockPos, codeBlockNode!, codeBlockPos, clickEvent, true) || clickHandled
      return clickHandled
    })
    expect(clickHandled).toBe(true)

    const beforeInput = view!.state.selection.from
    view!.dispatch(view!.state.tr.insertText('tail', beforeInput, beforeInput))

    await flushPromises()
    await wait(400)

    expect(store.liveContent).toContain('```js\nconst x = 1;\n```\n\ntail')

    await wrapper.unmount()
  }, 20000)
})

import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { EditorView } from '@milkdown/prose/view'
import { TextSelection } from '@milkdown/prose/state'
import { editorViewCtx } from '@milkdown/core'
import { mountWysiwygEditor } from '../helpers/mountWysiwygEditor'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('WysiwygEditor 代码块点击落位', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('点击代码块后光标停留在块内，输入文本出现在代码块内（不再强制跳到下一行）', async () => {
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

    // 回归守护：点击代码块内容时，任何 handleClickOn 均不得拦截（返回 false = 走 ProseMirror 默认点击定位）
    let clickOnHandler: ((...args: unknown[]) => boolean) | undefined
    view!.someProp('handleClickOn', (handler) => {
      clickOnHandler = handler
      return false
    })
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
    Object.defineProperty(clickEvent, 'target', { configurable: true, value: editable })
    const clickHandled =
      clickOnHandler?.(view!, codeBlockPos, codeBlockNode!, codeBlockPos, clickEvent, true) ?? false
    expect(clickHandled).toBe(false)

    // 模拟点击代码块内文本后：光标停留在块内文本末尾，随后输入应写入代码块内部
    const insidePos = codeBlockPos + 1 + 'const x = 1;'.length
    view!.dispatch(view!.state.tr.setSelection(TextSelection.create(view!.state.doc, insidePos)))
    view!.dispatch(view!.state.tr.insertText('tail', insidePos, insidePos))

    await flushPromises()
    await wait(400)

    expect(store.liveContent).toContain('const x = 1;tail')
    expect(store.liveContent).not.toContain('```\n\ntail')

    await wrapper.unmount()
  }, 20000)
})

import { describe, expect, it, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { editorViewCtx } from '@milkdown/core'
import type { EditorView } from '@milkdown/prose/view'
import { TextSelection } from '@milkdown/prose/state'
import { mountWysiwygEditor } from '../helpers/mountWysiwygEditor'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getEditorView(wrapper: Awaited<ReturnType<typeof mountWysiwygEditor>>['wrapper']) {
  const editor = (wrapper.vm as { editor?: { action: (runner: (ctx: unknown) => void) => void } }).editor
  let view: EditorView | undefined
  editor?.action((ctx) => {
    view = (ctx as { get: (value: typeof editorViewCtx) => EditorView }).get(editorViewCtx)
  })
  expect(view).toBeTruthy()
  return view!
}

describe('WysiwygEditor 高亮显示', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('选区点击高亮后应写回 ==文本==', async () => {
    const { wrapper, store } = await mountWysiwygEditor('hello world')
    const view = getEditorView(wrapper)

    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 6)))
    await wrapper.get('[data-testid="toolbar-highlight"]').trigger('click')
    await flushPromises()
    await wait(400)

    expect(store.liveContent).toContain('==hello==')

    await wrapper.unmount()
  }, 15000)

  it('无选区点击高亮后应通过弹框插入文本并写回 Markdown', async () => {
    const { wrapper, store } = await mountWysiwygEditor('world')
    const view = getEditorView(wrapper)

    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1)))
    await wrapper.get('[data-testid="toolbar-highlight"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="highlight-text-modal"]').exists()).toBe(true)

    await wrapper.get('[data-testid="highlight-text-input"]').setValue('重点')
    await wrapper.get('[data-testid="highlight-text-confirm"]').trigger('click')
    await flushPromises()
    await wait(400)

    expect(store.liveContent).toContain('==重点==')

    await wrapper.unmount()
  }, 15000)
})

import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { editorViewCtx } from '@milkdown/core'
import type { EditorView } from '@milkdown/prose/view'
import { mountWysiwygEditor } from '../helpers/mountWysiwygEditor'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getEditorView(wrapper: ReturnType<typeof mountWysiwygEditor> extends Promise<infer T> ? T['wrapper'] : never) {
  const editor = (wrapper.vm as { editor?: { action: (runner: (ctx: unknown) => void) => void } }).editor
  let view: EditorView | undefined
  editor?.action((ctx) => {
    view = (ctx as { get: (value: typeof editorViewCtx) => EditorView }).get(editorViewCtx)
  })
  expect(view).toBeTruthy()
  return view!
}

describe('WysiwygEditor strong mark', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('初始化时应将 **bold** 渲染为 strong', async () => {
    const { wrapper, prose } = await mountWysiwygEditor('before **bold** after')

    expect(prose.querySelector('strong')?.textContent).toBe('bold')
    expect(prose.textContent).toContain('before bold after')
    expect(prose.textContent).not.toContain('**bold**')

    await wrapper.unmount()
  }, 15000)

  it('编辑时输入闭合的 **bold** 后应即时转为 strong', async () => {
    const { wrapper, prose } = await mountWysiwygEditor('')
    const view = getEditorView(wrapper)

    view.dispatch(view.state.tr.insertText('**bold**', 1, 1))
    await flushPromises()
    await wait(300)

    expect(prose.querySelector('strong')?.textContent).toBe('bold')
    expect(prose.textContent).toBe('bold')
    expect(prose.textContent).not.toContain('**')

    await wrapper.unmount()
  }, 15000)

  it('未闭合的 **bold 不应误转为 strong', async () => {
    const { wrapper, prose } = await mountWysiwygEditor('')
    const view = getEditorView(wrapper)

    view.dispatch(view.state.tr.insertText('**bold', 1, 1))
    await flushPromises()
    await wait(300)

    expect(prose.querySelector('strong')).toBeNull()
    expect(prose.textContent).toContain('**bold')

    await wrapper.unmount()
  }, 15000)

  it('行内代码字面量中的 **bold** 不应误转为 strong', async () => {
    const { wrapper, prose } = await mountWysiwygEditor('')
    const view = getEditorView(wrapper)

    view.dispatch(view.state.tr.insertText('`**bold**`', 1, 1))
    await flushPromises()
    await wait(300)

    expect(prose.querySelector('strong')).toBeNull()
    expect(prose.textContent).toContain('`**bold**`')

    await wrapper.unmount()
  }, 15000)
})

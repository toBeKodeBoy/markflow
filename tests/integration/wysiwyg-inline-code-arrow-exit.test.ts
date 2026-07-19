import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { TextSelection } from '@milkdown/prose/state'
import { editorViewCtx } from '@milkdown/core'
import type { EditorView } from '@milkdown/prose/view'
import { mountWysiwygEditor } from '../helpers/mountWysiwygEditor'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('WysiwygEditor inlineCode arrow exit', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('ArrowRight inside inlineCode should move normally before exiting at the right edge', async () => {
    const { wrapper, store } = await mountWysiwygEditor('使用 `abc` 变量')

    const editor = (wrapper.vm as { editor?: { action: (runner: (ctx: unknown) => void) => void } }).editor
    let view: EditorView | undefined
    editor?.action((ctx) => {
      view = (ctx as { get: (value: typeof editorViewCtx) => EditorView }).get(editorViewCtx)
    })
    expect(view).toBeTruthy()

    let inlineFrom = -1
    let inlineTo = -1
    view!.state.doc.descendants((node, pos) => {
      if (!node.isText || !node.marks.some((mark) => mark.type.name === 'inlineCode')) return true
      inlineFrom = pos
      inlineTo = pos + node.nodeSize
      return false
    })
    expect(inlineFrom).toBeGreaterThan(0)
    expect(inlineTo).toBeGreaterThan(inlineFrom)

    const middle = inlineFrom + 1
    view!.dispatch(view!.state.tr.setSelection(TextSelection.create(view!.state.doc, middle)))

    let handled = false
    view!.someProp('handleKeyDown', (handler) => {
      handled = handler(view!, new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      return handled
    })

    expect(handled).toBe(false)
    expect(view!.state.selection.from).toBe(middle)

    view!.dispatch(view!.state.tr.setSelection(TextSelection.create(view!.state.doc, inlineTo)))
    handled = false
    view!.someProp('handleKeyDown', (handler) => {
      handled = handler(view!, new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      return handled
    })

    expect(handled).toBe(true)
    expect(view!.state.selection.from).toBe(inlineTo)
    expect(view!.state.storedMarks).toEqual([])

    view!.dispatch(view!.state.tr.insertText('tail', inlineTo, inlineTo))
    await flushPromises()
    await wait(400)

    expect(store.liveContent).toContain('使用 `abc`tail 变量')

    await wrapper.unmount()
  }, 20000)
})

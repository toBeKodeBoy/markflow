import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { editorViewCtx } from '@milkdown/core'
import type { EditorView } from '@milkdown/prose/view'
import { mountWysiwygEditor } from '../helpers/mountWysiwygEditor'

function getEditorView(wrapper: Awaited<ReturnType<typeof mountWysiwygEditor>>['wrapper']) {
  const editor = (wrapper.vm as { editor?: { action: (runner: (ctx: unknown) => void) => void } }).editor
  let view: EditorView | undefined
  editor?.action((ctx) => {
    view = (ctx as { get: (value: typeof editorViewCtx) => EditorView }).get(editorViewCtx)
  })
  expect(view).toBeTruthy()
  return view!
}

describe('WysiwygEditor 脚注显示', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('脚注内容不应显示为原始 GFM 符号', async () => {
    const markdown = [
      '这里有一个脚注[^a]。',
      '',
      '[^a]: 脚注内容',
    ].join('\n')
    const { wrapper, prose, store } = await mountWysiwygEditor(markdown)

    const ref = prose.querySelector('sup[data-type="footnote_reference"]')
    const def = wrapper.element.querySelector('dl[data-type="footnote_definition"]')
    const term = def?.querySelector('dt')

    expect(prose.textContent).toContain('这里有一个脚注')
    expect(prose.textContent).toContain('脚注内容')
    expect(prose.textContent).not.toContain('[^a]')
    expect(ref?.getAttribute('data-footnote-index')).toBe('1')
    expect(def?.getAttribute('data-footnote-index')).toBe('1')
    expect(def).toBeTruthy()
    expect(term?.textContent).toBe('a')
    expect(store.liveContent.trimEnd()).toBe(markdown)

    await wrapper.unmount()
  }, 15000)

  it('数字 label 脚注加载后渲染为节点而非原始字符串', async () => {
    const markdown = [
      '# 脚注语法',
      '',
      '正文[^0]',
      '',
      '正文[^1]',
      '',
      '[^0]:哈哈',
      '[^1]:kkj',
    ].join('\n')
    const { wrapper, prose, store } = await mountWysiwygEditor(markdown)

    expect(prose.querySelectorAll('sup[data-type="footnote_reference"]')).toHaveLength(2)
    expect(wrapper.element.querySelectorAll('dl[data-type="footnote_definition"]')).toHaveLength(2)
    expect(prose.textContent).not.toContain('[^0]')
    expect(prose.textContent).not.toContain('[^1]')
    expect(store.liveContent).not.toContain('\\[^')
    expect(store.liveContent).toContain('[^0]')
    expect(store.liveContent).toMatch(/\[\^1\]:\s*kkj/)

    const refs = prose.querySelectorAll('sup[data-type="footnote_reference"]')
    const defs = wrapper.element.querySelectorAll('dl[data-type="footnote_definition"]')
    expect(refs[0]?.getAttribute('data-footnote-index')).toBe('1')
    expect(refs[1]?.getAttribute('data-footnote-index')).toBe('2')
    expect(defs[0]?.getAttribute('data-label')).toBe('0')
    expect(defs[0]?.getAttribute('data-footnote-index')).toBe('1')
    expect(defs[1]?.getAttribute('data-label')).toBe('1')
    expect(defs[1]?.getAttribute('data-footnote-index')).toBe('2')

    await wrapper.unmount()
  }, 15000)

  it('定义顺序与首次引用顺序不一致时编号仍对齐', async () => {
    const markdown = [
      '先 b[^b]，后 a[^a]。',
      '',
      '[^a]: A 定义在前',
      '[^b]: B 定义在后',
    ].join('\n')
    const { wrapper, prose } = await mountWysiwygEditor(markdown)

    const refs = prose.querySelectorAll('sup[data-type="footnote_reference"]')
    const defs = [...wrapper.element.querySelectorAll('dl[data-type="footnote_definition"]')]
    const defByLabel = Object.fromEntries(
      defs.map((el) => [el.getAttribute('data-label'), el.getAttribute('data-footnote-index')]),
    )

    expect(refs[0]?.getAttribute('data-footnote-index')).toBe('1')
    expect(refs[1]?.getAttribute('data-footnote-index')).toBe('2')
    expect(defByLabel.b).toBe('1')
    expect(defByLabel.a).toBe('2')

    await wrapper.unmount()
  }, 15000)

  it('键入脚注语法后自动转为脚注节点且序列化不转义', async () => {
    const { wrapper, prose, store } = await mountWysiwygEditor('')
    const view = getEditorView(wrapper)
    const { schema } = view.state
    const paragraphType = schema.nodes.paragraph!

    view.dispatch(view.state.tr.insertText('正文[^0]', 1))
    await new Promise((r) => setTimeout(r, 50))

    const defParagraph = paragraphType.create(null, schema.text('[^0]:哈哈'))
    view.dispatch(view.state.tr.insert(view.state.doc.content.size, defParagraph))
    await new Promise((r) => setTimeout(r, 300))

    const ref = prose.querySelector('sup[data-type="footnote_reference"]')
    const def = wrapper.element.querySelector('dl[data-type="footnote_definition"]')

    expect(ref).toBeTruthy()
    expect(def).toBeTruthy()
    expect(prose.textContent).not.toContain('[^0]')
    expect(store.liveContent).not.toContain('\\[^')
    expect(store.liveContent).toMatch(/\[\^0\]/)

    await wrapper.unmount()
  }, 15000)
})

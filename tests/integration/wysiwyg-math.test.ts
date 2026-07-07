/**
 * WYSIWYG 数学公式渲染与序列化
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import WysiwygEditor from '@/components/WysiwygEditor.vue'
import { useNoteStore } from '@/stores/note'

async function mountWysiwyg() {
  const wrapper = mount(WysiwygEditor)
  await flushPromises()
  await new Promise((r) => setTimeout(r, 800))
  const prose = wrapper.element.querySelector('.ProseMirror')
  expect(prose).toBeTruthy()
  return { wrapper, prose: prose! }
}

describe('WysiwygEditor math', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('行内 $...$ 应渲染 katex 而非纯文本', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('公式 $E=mc^2$ 结束')

    const { wrapper, prose } = await mountWysiwyg()

    expect(prose.querySelector('.katex')).toBeTruthy()
    expect(prose.textContent).toContain('公式')
    expect(prose.textContent).toContain('结束')

    await wrapper.unmount()
  }, 15000)

  it('块级 $$...$$ 应渲染 katex-display', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('$$\n\\int_0^1 x\\,dx\n$$')

    const { wrapper, prose } = await mountWysiwyg()

    expect(prose.querySelector('.katex-display')).toBeTruthy()

    await wrapper.unmount()
  }, 15000)

  it('单行块级 $$...$$ 应渲染 katex-display', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('$$\\int_0^1 x\\,dx$$')

    const { wrapper, prose } = await mountWysiwyg()

    expect(prose.querySelector('.katex-display')).toBeTruthy()
    expect(prose.textContent).not.toContain('$$')

    await wrapper.unmount()
  }, 15000)

  it('保存时应保留 $...$ 分隔符', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('公式 $E=mc^2$ 结束')

    const { wrapper } = await mountWysiwyg()

    expect(store.liveContent).toMatch(/\$E=mc\^2\$/)
    expect(store.liveContent).not.toMatch(/\\$/)

    await wrapper.unmount()
  }, 15000)

  it('行内代码 `$x$` 不应渲染为 katex', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('使用 `$x$` 变量')

    const { wrapper, prose } = await mountWysiwyg()

    expect(prose.querySelector('.katex')).toBeFalsy()
    expect(prose.querySelector('code')?.textContent).toBe('$x$')
    expect(store.liveContent).toContain('`$x$`')

    await wrapper.unmount()
  }, 15000)
})

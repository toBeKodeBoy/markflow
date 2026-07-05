/**
 * 验证 WYSIWYG 保存 HTML 时是否错误转义为 \<
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

describe('WYSIWYG HTML 序列化', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('保存 <span> 时不应添加反斜杠转义', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('<span>abc</span>')

    const { wrapper } = await mountWysiwyg()

    expect(store.liveContent).not.toMatch(/\\</)
    expect(store.liveContent).toContain('<span>abc</span>')

    await wrapper.unmount()
  }, 15000)

  it('被转义的 \\<span> 加载后应还原并渲染', async () => {
    const store = useNoteStore()
    store.createNoteWithContent(String.raw`\<span>abc\</span>`)

    const { wrapper, prose } = await mountWysiwyg()

    expect(prose.querySelector('span')?.textContent).toBe('abc')
    expect(store.liveContent).not.toMatch(/\\</)
    expect(store.liveContent).toContain('<span>abc</span>')

    await wrapper.unmount()
  }, 15000)
})

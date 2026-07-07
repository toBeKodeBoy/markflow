/**
 * WYSIWYG mermaid 代码块预览
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import WysiwygEditor from '@/components/WysiwygEditor.vue'
import { useNoteStore } from '@/stores/note'

async function mountWysiwyg() {
  const wrapper = mount(WysiwygEditor)
  await flushPromises()
  await new Promise((r) => setTimeout(r, 1200))
  const prose = wrapper.element.querySelector('.ProseMirror')
  expect(prose).toBeTruthy()
  return { wrapper, prose: prose! }
}

describe('WysiwygEditor mermaid', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('```mermaid 代码块应渲染 SVG 预览', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('```mermaid\ngraph TD;\n  A-->B\n```')

    const { wrapper, prose } = await mountWysiwyg()

    expect(prose.querySelector('.mermaid-preview svg, svg')).toBeTruthy()

    await wrapper.unmount()
  }, 20000)

  it('保存时应保留 mermaid 围栏与源码', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('```mermaid\ngraph TD;\n  A-->B\n```')

    const { wrapper } = await mountWysiwyg()

    expect(store.liveContent).toContain('```mermaid')
    expect(store.liveContent).toContain('A-->B')

    await wrapper.unmount()
  }, 20000)
})

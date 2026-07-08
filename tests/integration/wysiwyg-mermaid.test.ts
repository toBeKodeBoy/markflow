/**
 * WYSIWYG mermaid 代码块预览
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNoteStore } from '@/stores/note'
import { mountWysiwygEditor } from '../helpers/mountWysiwygEditor'

describe('WysiwygEditor mermaid', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('```mermaid 代码块应渲染 SVG 预览', async () => {
    const { wrapper, prose } = await mountWysiwygEditor('```mermaid\ngraph TD;\n  A-->B\n```')

    expect(prose.querySelector('.mermaid-preview svg, svg')).toBeTruthy()

    await wrapper.unmount()
  }, 20000)

  it('保存时应保留 mermaid 围栏与源码', async () => {
    const { wrapper, store } = await mountWysiwygEditor('```mermaid\ngraph TD;\n  A-->B\n```')

    expect(store.liveContent).toContain('```mermaid')
    expect(store.liveContent).toContain('A-->B')

    await wrapper.unmount()
  }, 20000)
})

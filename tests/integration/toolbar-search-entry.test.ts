import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'
import { useNoteStore } from '@/stores/note'

const stubs = {
  WysiwygEditor: { template: '<div class="stub-wysiwyg" />' },
  Editor: { template: '<div class="stub-editor" />' },
  Preview: { template: '<div class="stub-preview" />' },
  Sidebar: { template: '<aside class="stub-sidebar" />' },
  Toc: { template: '<div class="stub-toc" />' },
  ImageLightbox: { template: '<div class="stub-lightbox" />' },
  FormatToolbar: true,
  FocusFormatToolbar: true,
}

describe('顶栏搜索与 Ctrl+K 同源', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    useNoteStore().createNoteWithContent('# Demo\n')
  })

  it('点击顶栏搜索按钮应打开 SearchModal', async () => {
    const wrapper = mount(App, { global: { stubs }, attachTo: document.body })
    expect(wrapper.find('.search-modal').exists()).toBe(false)

    await wrapper.find('[data-testid="toolbar-search-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('.search-modal').exists()).toBe(true)
    wrapper.unmount()
  })

  it('Ctrl+K 与顶栏按钮共用同一开关状态', async () => {
    const wrapper = mount(App, { global: { stubs }, attachTo: document.body })

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
    )
    await flushPromises()
    expect(wrapper.find('.search-modal').exists()).toBe(true)

    await wrapper.find('[data-testid="toolbar-search-btn"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('.search-modal').exists()).toBe(false)

    await wrapper.find('[data-testid="toolbar-search-btn"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('.search-modal').exists()).toBe(true)

    wrapper.unmount()
  })
})

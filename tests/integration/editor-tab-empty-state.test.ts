import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'
import { useNoteStore } from '@/stores/note'
import { useEditorTabsStore } from '@/stores/editorTabs'

const stubs = {
  WysiwygEditor: { template: '<div class="stub-wysiwyg" />' },
  Editor: { template: '<div class="stub-editor" />' },
  Preview: { template: '<div class="stub-preview" />' },
  Sidebar: { template: '<aside class="stub-sidebar" />' },
  Toc: { template: '<div class="stub-toc" />' },
  ImageLightbox: { template: '<div class="stub-lightbox" />' },
}

describe('editor tab empty state', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    const store = useNoteStore()
    store.createNoteWithContent('# Demo\n')
  })

  it('shows an empty state after all tabs are closed', async () => {
    const wrapper = mount(App, { global: { stubs } })
    const tabsStore = useEditorTabsStore()

    tabsStore.closeAllTabs({ save: false })
    await flushPromises()

    expect(wrapper.find('[data-testid="empty-tabs-state"]').exists()).toBe(true)
    expect(wrapper.find('.stub-wysiwyg').exists()).toBe(false)
    expect(wrapper.find('.stub-editor').exists()).toBe(false)
    expect(wrapper.find('.stub-preview').exists()).toBe(false)
  })
})

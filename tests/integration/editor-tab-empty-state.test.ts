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

  it('opens the unified create modal from empty state instead of creating immediately', async () => {
    const wrapper = mount(App, { global: { stubs } })
    const tabsStore = useEditorTabsStore()
    const store = useNoteStore()

    tabsStore.closeAllTabs({ save: false })
    const noteCountBefore = store.noteList.length
    await flushPromises()

    await wrapper.find('[data-testid="empty-tabs-state"] .btn-primary').trigger('click')
    await flushPromises()

    expect(store.noteList.length).toBe(noteCountBefore)
    expect(wrapper.text()).toContain('新建内容')
    expect(wrapper.text()).toContain('新建文件')
  })

  it('persists sidebar selection and expansion when creating from empty state with sidebar closed', async () => {
    const store = useNoteStore()
    const parentFolder = store.createFolder('父目录')
    store.activeFolderId = parentFolder.id
    localStorage.setItem('markflow_settings', JSON.stringify({
      theme: 'light',
      fontSize: 14,
      editorFontFamily: 'monospace',
      sidebarVisible: false,
      sidebarActiveFolderId: null,
      sidebarExpandedFolderIds: [],
    }))

    const wrapper = mount(App, { global: { stubs } })
    const tabsStore = useEditorTabsStore()
    tabsStore.closeAllTabs({ save: false })
    await flushPromises()

    await wrapper.find('[data-testid="empty-tabs-state"] .btn-primary').trigger('click')
    await flushPromises()
    await wrapper.findAll('.create-entry-kind-card')[1].trigger('click')
    await wrapper.find('.create-entry-input').setValue('子目录')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    const createdFolder = store.folderList.find(
      (folder) => folder.name === '子目录' && folder.parentId === parentFolder.id
    )

    expect(createdFolder).toBeTruthy()
    expect(store.activeFolderId).toBe(createdFolder?.id)
    expect(wrapper.find('.stub-sidebar').exists()).toBe(true)

    const settings = JSON.parse(localStorage.getItem('markflow_settings') ?? '{}')
    expect(settings.sidebarVisible).toBe(true)
    expect(settings.sidebarActiveFolderId).toBe(createdFolder?.id)
    expect(settings.sidebarExpandedFolderIds).toEqual(
      expect.arrayContaining([parentFolder.id, createdFolder!.id])
    )
  })
})

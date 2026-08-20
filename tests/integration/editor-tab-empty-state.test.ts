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

  it('hides workspace chrome and view mode dropdown when no tabs are open', async () => {
    const wrapper = mount(App, { global: { stubs } })
    const tabsStore = useEditorTabsStore()

    expect(wrapper.find('[data-testid="workspace-chrome-bar"]').exists()).toBe(true)

    tabsStore.closeAllTabs({ save: false })
    await flushPromises()

    expect(wrapper.find('[data-testid="empty-tabs-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="workspace-chrome-bar"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="view-mode-dropdown"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="view-mode-hotzone"]').exists()).toBe(false)
  })

  it('opens the unified create modal from empty state instead of creating immediately', async () => {
    const wrapper = mount(App, { global: { stubs } })
    const tabsStore = useEditorTabsStore()
    const store = useNoteStore()

    tabsStore.closeAllTabs({ save: false })
    const noteCountBefore = store.noteList.length
    await flushPromises()

    await wrapper.find('[data-testid="empty-home-create"]').trigger('click')
    await flushPromises()

    expect(store.noteList.length).toBe(noteCountBefore)
    expect(wrapper.text()).toContain('新建内容')
    expect(wrapper.find('.create-entry-kind-card.active').text()).toContain('新建文件')
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

    await wrapper.find('[data-testid="empty-home-create"]').trigger('click')
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

  it('opens the unified create modal as folder from empty state instead of creating immediately', async () => {
    const wrapper = mount(App, { global: { stubs } })
    const tabsStore = useEditorTabsStore()
    const store = useNoteStore()

    tabsStore.closeAllTabs({ save: false })
    const noteCountBefore = store.noteList.length
    const folderCountBefore = store.folderList.length
    await flushPromises()

    await wrapper.find('[data-testid="empty-home-create"]').trigger('click')
    await flushPromises()
    await wrapper.findAll('.create-entry-kind-card')[1].trigger('click')
    await flushPromises()

    expect(store.noteList.length).toBe(noteCountBefore)
    expect(store.folderList.length).toBe(folderCountBefore)
    expect(wrapper.text()).toContain('新建内容')
    expect(wrapper.find('.create-entry-kind-card.active').text()).toContain('新建文件夹')
  })

  it('取消新建文件夹后再点新建文档，弹窗 kind 回到 note', async () => {
    const wrapper = mount(App, { global: { stubs } })
    const tabsStore = useEditorTabsStore()
    tabsStore.closeAllTabs({ save: false })
    await flushPromises()

    await wrapper.find('[data-testid="empty-home-create"]').trigger('click')
    await flushPromises()
    await wrapper.findAll('.create-entry-kind-card')[1].trigger('click')
    await flushPromises()
    expect(wrapper.find('.create-entry-kind-card.active').text()).toContain('新建文件夹')

    await wrapper.find('.create-entry-overlay').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="empty-home-create"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('.create-entry-kind-card.active').text()).toContain('新建文件')
  })

  it('首次打开空首页默认关闭侧栏', async () => {
    const wrapper = mount(App, { global: { stubs } })
    const tabsStore = useEditorTabsStore()
    tabsStore.closeAllTabs({ save: false })
    await flushPromises()

    expect(wrapper.find('.stub-sidebar').exists()).toBe(false)
    expect(wrapper.find('[data-testid="empty-home-commands"]').exists()).toBe(true)
  })

  it('顶栏汉堡在空首页关闭时可展开并写入设置', async () => {
    localStorage.setItem('markflow_settings', JSON.stringify({
      theme: 'light',
      fontSize: 14,
      editorFontFamily: 'monospace',
      sidebarVisible: false,
    }))

    const wrapper = mount(App, { global: { stubs } })
    const tabsStore = useEditorTabsStore()
    tabsStore.closeAllTabs({ save: false })
    await flushPromises()

    expect(wrapper.find('.stub-sidebar').exists()).toBe(false)
    expect(wrapper.find('[data-testid="empty-home-open-sidebar"]').exists()).toBe(false)

    await wrapper.find('[aria-label="切换侧边栏"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('.stub-sidebar').exists()).toBe(true)
    expect(JSON.parse(localStorage.getItem('markflow_settings') ?? '{}').sidebarVisible).toBe(true)
  })

  it('顶栏汉堡在空首页可收起，连点两次回到原状态', async () => {
    localStorage.setItem('markflow_settings', JSON.stringify({
      theme: 'light',
      fontSize: 14,
      editorFontFamily: 'monospace',
      sidebarVisible: true,
    }))

    const wrapper = mount(App, { global: { stubs } })
    const tabsStore = useEditorTabsStore()
    tabsStore.closeAllTabs({ save: false })
    await flushPromises()

    expect(wrapper.find('.stub-sidebar').exists()).toBe(true)
    expect(wrapper.find('[data-testid="empty-home-open-sidebar"]').exists()).toBe(false)

    await wrapper.find('[aria-label="切换侧边栏"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('.stub-sidebar').exists()).toBe(false)
    expect(JSON.parse(localStorage.getItem('markflow_settings') ?? '{}').sidebarVisible).toBe(false)

    await wrapper.find('[aria-label="切换侧边栏"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('.stub-sidebar').exists()).toBe(true)
    expect(JSON.parse(localStorage.getItem('markflow_settings') ?? '{}').sidebarVisible).toBe(true)
  })
})

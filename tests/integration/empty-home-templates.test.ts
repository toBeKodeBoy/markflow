import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'
import { useNoteStore } from '@/stores/note'
import { useEditorTabsStore } from '@/stores/editorTabs'
import { NOTE_TEMPLATES } from '@/constants/noteTemplates'

const stubs = {
  WysiwygEditor: { template: '<div class="stub-wysiwyg" />' },
  Editor: { template: '<div class="stub-editor" />' },
  Preview: { template: '<div class="stub-preview" />' },
  Sidebar: { template: '<aside class="stub-sidebar" />' },
  Toc: { template: '<div class="stub-toc" />' },
  ImageLightbox: { template: '<div class="stub-lightbox" />' },
}

describe('empty home templates and tutorial', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('空库点击模板会创建笔记并打开 Tab', async () => {
    const wrapper = mount(App, { global: { stubs } })
    const store = useNoteStore()
    const tabsStore = useEditorTabsStore()

    expect(wrapper.find('[data-testid="empty-tabs-state"]').exists()).toBe(true)
    await wrapper.findAll('[data-testid="empty-home-template-card"]')[0].trigger('click')
    await flushPromises()

    expect(store.noteList).toHaveLength(1)
    expect(store.noteList[0].title).toBe(NOTE_TEMPLATES[0].title)
    expect(store.getNoteContentById(store.noteList[0].id)).not.toMatch(/\{\{title\}\}/)
    expect(store.getNoteContentById(store.noteList[0].id).length).toBeGreaterThan(180)
    expect(tabsStore.activeTabId).toBe(store.noteList[0].id)
  })

  it('关闭全部 Tab 后非空库仍可从模板创建', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# 已有笔记\n')
    const wrapper = mount(App, { global: { stubs } })
    const tabsStore = useEditorTabsStore()
    tabsStore.closeAllTabs({ save: false })
    await flushPromises()

    expect(wrapper.find('[data-testid="empty-home-templates"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="empty-home-example-library"]').exists()).toBe(false)

    await wrapper.findAll('[data-testid="empty-home-template-card"]')[1].trigger('click')
    await flushPromises()

    expect(store.noteList.some((item) => item.title === NOTE_TEMPLATES[1].title)).toBe(true)
    expect(tabsStore.activeTabId).toBeTruthy()
  })

  it('从模板创建到文件夹时展开祖先路径并写入设置', async () => {
    const store = useNoteStore()
    const parent = store.createFolder('文档')
    const child = store.createFolder('接口', parent.id)
    store.activeFolderId = child.id
    localStorage.setItem('markflow_settings', JSON.stringify({
      theme: 'light',
      fontSize: 14,
      editorFontFamily: 'monospace',
      sidebarVisible: false,
      sidebarActiveFolderId: null,
      sidebarExpandedFolderIds: [],
    }))

    const wrapper = mount(App, { global: { stubs } })
    useEditorTabsStore().closeAllTabs({ save: false })
    await flushPromises()

    await wrapper.findAll('[data-testid="empty-home-template-card"]')[0].trigger('click')
    await flushPromises()

    const settings = JSON.parse(localStorage.getItem('markflow_settings') ?? '{}')
    expect(store.noteList.some((item) => item.folderId === child.id)).toBe(true)
    expect(settings.sidebarActiveFolderId).toBe(child.id)
    expect(settings.sidebarExpandedFolderIds).toEqual(
      expect.arrayContaining([parent.id, child.id]),
    )
    expect(settings.sidebarVisible).toBe(false)
  })

  it('顶栏新手教程按需打开且不重复创建', async () => {
    const wrapper = mount(App, { global: { stubs } })
    const store = useNoteStore()

    await wrapper.find('[data-testid="toolbar-tutorial-btn"]').trigger('click')
    await flushPromises()
    expect(store.noteList).toHaveLength(1)
    const firstId = store.noteList[0].id

    useEditorTabsStore().closeAllTabs({ save: false })
    await flushPromises()
    await wrapper.find('[data-testid="toolbar-tutorial-btn"]').trigger('click')
    await flushPromises()

    expect(store.noteList).toHaveLength(1)
    expect(store.noteList[0].id).toBe(firstId)
  })
})

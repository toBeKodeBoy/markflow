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

describe('empty home commands', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('空库点击新建文档打开创建弹窗，不立刻写笔记', async () => {
    const wrapper = mount(App, { global: { stubs } })
    const store = useNoteStore()

    expect(wrapper.find('[data-testid="empty-tabs-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="empty-home-mark"]').exists()).toBe(true)
    await wrapper.find('[data-testid="empty-home-create"]').trigger('click')
    await flushPromises()

    expect(store.noteList).toHaveLength(0)
    expect(wrapper.text()).toContain('新建内容')
    expect(wrapper.find('.create-entry-kind-card.active').text()).toContain('新建文件')
  })

  it('点击搜索文档打开搜索框', async () => {
    const wrapper = mount(App, { global: { stubs } })

    await wrapper.find('[data-testid="empty-home-search"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('.search-modal').exists()).toBe(true)
  })

  it('点击打开设置弹出设置面板', async () => {
    const wrapper = mount(App, { global: { stubs } })

    await wrapper.find('[data-testid="empty-home-settings"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('.settings-modal').exists()).toBe(true)
  })

  it('Ctrl+N / Ctrl+K / Ctrl+Alt+S 与三行命令同源', async () => {
    const wrapper = mount(App, { global: { stubs } })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', ctrlKey: true, bubbles: true }))
    await flushPromises()
    expect(wrapper.find('.create-entry-kind-card.active').text()).toContain('新建文件')

    await wrapper.find('.create-entry-overlay').trigger('click')
    await flushPromises()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
    await flushPromises()
    expect(wrapper.find('.search-modal').exists()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
    await flushPromises()

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Unidentified',
      code: 'KeyS',
      ctrlKey: true,
      altKey: true,
      bubbles: true,
    }))
    await flushPromises()
    expect(wrapper.find('.settings-modal').exists()).toBe(true)
  })

  it('关闭全部 Tab 后非空库仍渲染命令行，不渲染模板', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# 已有笔记\n')
    const wrapper = mount(App, { global: { stubs } })
    const tabsStore = useEditorTabsStore()
    tabsStore.closeAllTabs({ save: false })
    await flushPromises()

    expect(wrapper.find('[data-testid="empty-home-commands"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="empty-home-templates"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="empty-home-example-library"]').exists()).toBe(false)
  })

  it('顶栏新手教程按需打开且不重复创建', async () => {
    const wrapper = mount(App, { global: { stubs } })
    const store = useNoteStore()

    await wrapper.find('[data-testid="toolbar-overflow-btn"]').trigger('click')
    await wrapper.find('[data-testid="toolbar-tutorial-btn"]').trigger('click')
    await flushPromises()
    expect(store.noteList).toHaveLength(1)
    const firstId = store.noteList[0].id

    useEditorTabsStore().closeAllTabs({ save: false })
    await flushPromises()
    await wrapper.find('[data-testid="toolbar-overflow-btn"]').trigger('click')
    await wrapper.find('[data-testid="toolbar-tutorial-btn"]').trigger('click')
    await flushPromises()

    expect(store.noteList).toHaveLength(1)
    expect(store.noteList[0].id).toBe(firstId)
  })
})

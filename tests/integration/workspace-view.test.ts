import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'
import { useNoteStore } from '@/stores/note'
import { useEditorTabsStore } from '@/stores/editorTabs'
import { useWorkspaceStore } from '@/stores/workspace'

const stubs = {
  WysiwygEditor: { template: '<div class="stub-wysiwyg" />' },
  Editor: { template: '<div class="stub-editor" />' },
  Preview: { template: '<div class="stub-preview" />' },
  Toc: { template: '<div class="stub-toc" />' },
  ImageLightbox: { template: '<div class="stub-lightbox" />' },
}

function mountApp() {
  return mount(App, { global: { stubs } })
}

describe('workspace view', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('markflow_settings', JSON.stringify({
      theme: 'light',
      fontSize: 14,
      editorFontFamily: 'monospace',
      previewVisible: true,
      sidebarVisible: true,
    }))
    setActivePinia(createPinia())
  })

  it('无页签时 workspaceView 为 home 且渲染 Home', async () => {
    const wrapper = mountApp()
    const workspace = useWorkspaceStore()

    expect(workspace.view).toBe('home')
    expect(wrapper.find('[data-testid="empty-tabs-state"]').exists()).toBe(true)
    expect(wrapper.find('.stub-wysiwyg').exists()).toBe(false)
  })

  it('openTab 后为 editor 并渲染编辑器', async () => {
    const store = useNoteStore()
    const note = store.createNoteWithContent('# P3 Editor\n')
    const wrapper = mountApp()
    const tabs = useEditorTabsStore()
    const workspace = useWorkspaceStore()

    tabs.closeAllTabs({ save: false })
    await flushPromises()
    tabs.openTab(note.id)
    await flushPromises()

    expect(workspace.view).toBe('editor')
    expect(wrapper.find('.stub-wysiwyg').exists()).toBe(true)
    expect(wrapper.find('[data-testid="empty-tabs-state"]').exists()).toBe(false)
  })

  it('再点首页回到 home，页签数量不变', async () => {
    const store = useNoteStore()
    const note = store.createNoteWithContent('# Stay Open\n')
    const wrapper = mountApp()
    const tabs = useEditorTabsStore()
    const workspace = useWorkspaceStore()

    tabs.closeAllTabs({ save: false })
    tabs.openTab(note.id)
    await flushPromises()
    const tabCount = tabs.tabs.length

    await wrapper.get('[data-testid="sidebar-nav-home"]').trigger('click')
    await flushPromises()

    expect(workspace.view).toBe('home')
    expect(tabs.tabs.length).toBe(tabCount)
    expect(wrapper.find('[data-testid="empty-tabs-state"]').exists()).toBe(true)
    expect(wrapper.find('.stub-wysiwyg').exists()).toBe(false)
  })

  it('点回收站为 trash，主区为回收站', async () => {
    const wrapper = mountApp()
    const workspace = useWorkspaceStore()

    await wrapper.get('[data-testid="sidebar-nav-trash"]').trigger('click')
    await flushPromises()

    expect(workspace.view).toBe('trash')
    expect(wrapper.find('[data-testid="workspace-trash"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="empty-tabs-state"]').exists()).toBe(false)
  })

  it('有笔记时 Home 不渲染最近打开，仍渲染模板且无示例入口', async () => {
    const store = useNoteStore()
    const note = store.createNoteWithContent('# 最近一篇\n')
    const wrapper = mountApp()
    const tabs = useEditorTabsStore()

    tabs.closeAllTabs({ save: false })
    tabs.openTab(note.id)
    tabs.closeAllTabs({ save: false })
    await flushPromises()

    expect(wrapper.find('[data-testid="empty-home-recent"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="empty-home-commands"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="empty-home-templates"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="empty-home-example-library"]').exists()).toBe(false)
  })

  it('关光页签时若在回收站应保持 trash', async () => {
    const store = useNoteStore()
    const note = store.createNoteWithContent('# 关页签不离开回收站\n')
    const wrapper = mountApp()
    const tabs = useEditorTabsStore()
    const workspace = useWorkspaceStore()

    tabs.openTab(note.id)
    await wrapper.get('[data-testid="sidebar-nav-trash"]').trigger('click')
    await flushPromises()
    tabs.closeAllTabs({ save: false })
    await flushPromises()

    expect(workspace.view).toBe('trash')
    expect(wrapper.find('[data-testid="workspace-trash"]').exists()).toBe(true)
  })

  it('空库回收站不展示新手引导', async () => {
    const wrapper = mountApp()
    expect(wrapper.find('[data-testid="onboarding-coach"]').exists()).toBe(true)

    await wrapper.get('[data-testid="sidebar-nav-trash"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="onboarding-coach"]').exists()).toBe(false)
  })

  it('在回收站按 Escape 回到文档或首页', async () => {
    const wrapper = mountApp()
    const workspace = useWorkspaceStore()

    await wrapper.get('[data-testid="sidebar-nav-trash"]').trigger('click')
    await flushPromises()
    expect(workspace.view).toBe('trash')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()

    expect(workspace.view).toBe('home')
    expect(wrapper.find('[data-testid="workspace-trash"]').exists()).toBe(false)
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'
import { useNoteStore } from '@/stores/note'
import { useEditorTabsStore } from '@/stores/editorTabs'

const stubs = {
  WysiwygEditor: {
    props: ['noteId', 'focusMode', 'viewMode'],
    template: `
      <div class="stub-wysiwyg">
        <div class="editor-toolbar" data-testid="format-toolbar">
          <div class="view-mode-dropdown" data-testid="view-mode-dropdown">
            <button
              type="button"
              data-testid="view-mode-dropdown-trigger"
              @click="$emit('setViewMode', 'split')"
            >模式</button>
          </div>
        </div>
      </div>
    `,
    emits: ['setViewMode'],
  },
  Editor: {
    props: ['noteId', 'viewMode'],
    template: `
      <div class="stub-editor">
        <div class="editor-toolbar" data-testid="format-toolbar">
          <div class="view-mode-dropdown" data-testid="view-mode-dropdown">
            <button type="button" data-testid="view-mode-dropdown-trigger">模式</button>
          </div>
        </div>
      </div>
    `,
    emits: ['setViewMode'],
  },
  Preview: { template: '<div class="stub-preview" />' },
  Sidebar: { template: '<aside class="stub-sidebar" />' },
  Toc: { template: '<div class="stub-toc" />' },
  ImageLightbox: { template: '<div />' },
  EditorTabBar: { template: '<div class="editor-tab-bar-stub" />' },
}

describe('GCCD 工具栏视图下拉集成', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function mountApp() {
    return mount(App, { global: { stubs } })
  }

  it('空笔记时不渲染视图下拉', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# a')
    const wrapper = mountApp()
    const tabs = useEditorTabsStore()
    tabs.closeAllTabs({ save: false })
    await flushPromises()

    expect(wrapper.find('[data-testid="empty-tabs-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="view-mode-dropdown"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="view-mode-hotzone"]').exists()).toBe(false)
  })

  it('打开笔记默认预览；工具栏存在下拉；无热区', async () => {
    const store = useNoteStore()
    store.createNote()
    const wrapper = mountApp()
    await flushPromises()

    expect(wrapper.find('.app').classes()).toContain('mode-live')
    expect(wrapper.find('[data-testid="view-mode-dropdown"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="view-mode-hotzone"]').exists()).toBe(false)
  })

  it('无打开文档时 Ctrl+Shift+K 不切换；有文档时可用', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# a')
    const wrapper = mountApp()
    const tabs = useEditorTabsStore()
    tabs.closeAllTabs({ save: false })
    await flushPromises()

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, shiftKey: true, bubbles: true }),
    )
    await flushPromises()
    expect(wrapper.find('.app').classes()).not.toContain('mode-split')

    const note = store.createNoteWithContent('# b')
    tabs.openTab(note.id)
    await flushPromises()

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, shiftKey: true, bubbles: true }),
    )
    await flushPromises()
    expect(wrapper.find('.app').classes()).toContain('mode-split')
  })

  it('切换文档恢复各自 viewMode；新建固定 live', async () => {
    const store = useNoteStore()
    const a = store.createNoteWithContent('# A')
    const b = store.createNoteWithContent('# B')
    const wrapper = mountApp()
    const tabs = useEditorTabsStore()
    tabs.openTab(a.id)
    tabs.openTab(b.id)
    await flushPromises()

    tabs.activateTab(a.id)
    await flushPromises()
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, shiftKey: true, bubbles: true }),
    )
    await flushPromises()
    expect(wrapper.find('.app').classes()).toContain('mode-source')
    expect(tabs.findTab(a.id)?.viewMode).toBe('source')

    tabs.activateTab(b.id)
    await flushPromises()
    expect(wrapper.find('.app').classes()).toContain('mode-live')

    tabs.activateTab(a.id)
    await flushPromises()
    expect(wrapper.find('.app').classes()).toContain('mode-source')

    const created = store.createNoteWithContent('# C')
    tabs.openTabForNewNote(created.id)
    await flushPromises()
    expect(wrapper.find('.app').classes()).toContain('mode-live')
    expect(tabs.tabs.find((t) => t.noteId === created.id)?.viewMode).toBe('live')
  })

  it('进入专注不持久化 focus；切走再切回不会自动重进专注', async () => {
    const store = useNoteStore()
    const a = store.createNoteWithContent('# A')
    const b = store.createNoteWithContent('# B')
    const wrapper = mountApp()
    const tabs = useEditorTabsStore()
    tabs.openTab(a.id)
    tabs.openTab(b.id)
    tabs.activateTab(a.id)
    await flushPromises()

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, shiftKey: true, bubbles: true }),
    )
    await flushPromises()
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'm', ctrlKey: true, shiftKey: true, bubbles: true }),
    )
    await flushPromises()
    expect(wrapper.find('.app').classes()).toContain('mode-focus')
    expect(tabs.findTab(a.id)?.viewMode).toBe('source')

    tabs.activateTab(b.id)
    await flushPromises()
    expect(wrapper.find('.app').classes()).not.toContain('mode-focus')

    tabs.activateTab(a.id)
    await flushPromises()
    expect(wrapper.find('.app').classes()).toContain('mode-source')
    expect(tabs.findTab(a.id)?.viewMode).toBe('source')
  })
})

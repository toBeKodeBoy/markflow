/**
 * 四视图模式集成测试 — 组件树与 DOM 类名
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'
import { useNoteStore } from '@/stores/note'

const stubs = {
  WysiwygEditor: { template: '<div class="wysiwyg-pane stub-wysiwyg" />' },
  Editor: { template: '<div class="editor-pane stub-editor" />' },
  Preview: { template: '<div class="preview-pane stub-preview" />' },
  Sidebar: { template: '<aside class="sidebar stub-sidebar" />' },
  Toc: { template: '<div class="toc-pane stub-toc" />' },
}

function mountApp() {
  return mount(App, { global: { stubs } })
}

async function clickMode(wrapper: ReturnType<typeof mountApp>, label: string) {
  const btn = wrapper.findAll('.view-mode-switcher button').find((b) => b.text() === label)
  expect(btn).toBeDefined()
  await btn!.trigger('click')
  await flushPromises()
}

describe('四视图模式切换', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    const store = useNoteStore()
    store.createNote()
  })

  it('默认 live 模式渲染 WYSIWYG', () => {
    const wrapper = mountApp()
    expect(wrapper.find('.app').classes()).toContain('mode-live')
    expect(wrapper.find('.stub-wysiwyg').exists()).toBe(true)
    expect(wrapper.find('.stub-editor').exists()).toBe(false)
    expect(wrapper.find('.stub-preview').exists()).toBe(false)
  })

  it('分屏模式渲染 Editor + Preview', async () => {
    const wrapper = mountApp()
    await clickMode(wrapper, '分屏')
    expect(wrapper.find('.app').classes()).toContain('mode-split')
    expect(wrapper.find('.stub-editor').exists()).toBe(true)
    expect(wrapper.find('.stub-preview').exists()).toBe(true)
    expect(wrapper.find('.stub-wysiwyg').exists()).toBe(false)
  })

  it('源码模式仅渲染 Editor', async () => {
    const wrapper = mountApp()
    await clickMode(wrapper, '源码')
    expect(wrapper.find('.app').classes()).toContain('mode-source')
    expect(wrapper.find('.stub-editor').exists()).toBe(true)
    expect(wrapper.find('.stub-preview').exists()).toBe(false)
  })

  it('专注模式渲染 WYSIWYG 并隐藏侧边栏', async () => {
    const wrapper = mountApp()
    await clickMode(wrapper, '专注')
    expect(wrapper.find('.app').classes()).toContain('mode-focus')
    expect(wrapper.find('.stub-wysiwyg').exists()).toBe(true)
    expect(wrapper.find('.stub-sidebar').exists()).toBe(false)
  })

  it('setViewMode 应 flush 未落盘的 liveContent', async () => {
    const wrapper = mountApp()
    const store = useNoteStore()
    store.setLiveContent('# 未保存标题\n\n正文')
    await clickMode(wrapper, '分屏')
    expect(store.currentNote?.content).toBe('# 未保存标题\n\n正文')
  })

  it('Esc 退出专注模式恢复前一个模式', async () => {
    const wrapper = mountApp()
    await clickMode(wrapper, '分屏')
    await clickMode(wrapper, '专注')
    expect(wrapper.find('.app').classes()).toContain('mode-focus')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(wrapper.find('.app').classes()).toContain('mode-split')
  })

  it('大文件打开时 live 模式自动切分屏', async () => {
    const wrapper = mountApp()
    const store = useNoteStore()
    const note = store.createNoteWithContent('x'.repeat(200_001))
    store.clearPendingLargeFileSwitch()
    store.openNote(note.id)
    await flushPromises()
    expect(wrapper.find('.app').classes()).toContain('mode-split')
    expect(wrapper.find('.stub-preview').exists()).toBe(true)
  })
})

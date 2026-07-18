/**
 * 四视图模式集成测试 — 组件树与 DOM 类名
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { computed } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'
import { useNoteStore } from '@/stores/note'
import FocusFormatToolbar from '@/components/FocusFormatToolbar.vue'
import { useFocusToolbarVisibility } from '@/composables/useFocusToolbarVisibility'

const WysiwygEditorStub = {
  props: {
    noteId: { type: String, required: true },
    focusMode: { type: Boolean, default: false },
  },
  components: { FocusFormatToolbar },
  setup(props: { focusMode: boolean }) {
    const enabled = computed(() => props.focusMode)
    const { visible, onToolbarEnter, onToolbarLeave } = useFocusToolbarVisibility(enabled)
    return { visible, onToolbarEnter, onToolbarLeave, focusMode: enabled }
  },
  template: `
    <div class="wysiwyg-pane stub-wysiwyg">
      <div v-if="!focusMode" class="editor-toolbar"></div>
      <FocusFormatToolbar
        v-if="focusMode"
        :visible="visible"
        @mouseenter="onToolbarEnter"
        @mouseleave="onToolbarLeave"
      />
    </div>
  `,
}

const stubs = {
  EditorTabBar: { template: '<div class="editor-tab-bar-stub" />' },
  WysiwygEditor: WysiwygEditorStub,
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

  it('非专注模式下页签栏位于右侧主内容列，侧栏上移为 workspace 首列', () => {
    const wrapper = mountApp()
    const workspace = wrapper.get('.workspace')
    const children = workspace.element.children

    expect(children[0]).toBe(wrapper.get('.stub-sidebar').element)
    expect(children[1]).toBe(wrapper.get('.workspace-main').element)
    expect(wrapper.get('.workspace-main').find('.editor-tab-bar-stub').exists()).toBe(true)
    expect(Array.from(children).some((child) => child.classList.contains('editor-tab-bar-stub'))).toBe(false)
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

  it('专注模式隐藏常规工具栏并挂载浮动格式化栏', async () => {
    const wrapper = mountApp()
    await clickMode(wrapper, '专注')
    expect(wrapper.find('.stub-wysiwyg .editor-toolbar').exists()).toBe(false)
    expect(wrapper.find('[data-testid="focus-format-toolbar"]').exists()).toBe(true)
  })

  it('专注模式鼠标靠近底部时显示浮动工具栏', async () => {
    const wrapper = mountApp()
    await clickMode(wrapper, '专注')
    const toolbar = wrapper.get('[data-testid="focus-format-toolbar"]')
    expect(toolbar.classes()).toContain('is-hidden')

    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800)
    window.dispatchEvent(new MouseEvent('mousemove', { clientY: 760 }))
    await flushPromises()
    expect(toolbar.classes()).not.toContain('is-hidden')
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

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { useNoteStore } from '@/stores/note'
import { useEditorTabsStore } from '@/stores/editorTabs'

const { wysiwygInsertTaskListMock } = vi.hoisted(() => ({
  wysiwygInsertTaskListMock: vi.fn(),
}))

vi.mock('@/utils/wysiwygFormat', async () => {
  const actual = await vi.importActual<typeof import('@/utils/wysiwygFormat')>('@/utils/wysiwygFormat')
  return {
    ...actual,
    wysiwygInsertTaskList: wysiwygInsertTaskListMock,
  }
})

import WysiwygEditor from '@/components/WysiwygEditor.vue'

const FormatToolbarStub = defineComponent({
  props: {
    showTaskListButton: { type: Boolean, default: true },
  },
  emits: ['taskList'],
  template: '<div data-testid="toolbar-stub" :data-show-task-list="String(showTaskListButton)" />',
})

const FocusFormatToolbarStub = defineComponent({
  props: { visible: { type: Boolean, default: true } },
  emits: ['mouseenter', 'mouseleave'],
  template: '<div data-testid="focus-toolbar-stub" />',
})

describe('WysiwygEditor 任务列表工具栏接线', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    wysiwygInsertTaskListMock.mockClear()
  })

  it('普通工具栏 taskList 事件会调用 WYSIWYG 任务列表插入逻辑', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const note = store.createNoteWithContent('')
    tabsStore.openTab(note.id)

    const wrapper = mount(WysiwygEditor, {
      props: { noteId: note.id },
      global: {
        plugins: [pinia],
        stubs: {
          FormatToolbar: FormatToolbarStub,
          FocusFormatToolbar: FocusFormatToolbarStub,
          TableToolbar: true,
        },
      },
    })

    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 1200))

    wrapper.getComponent(FormatToolbarStub).vm.$emit('taskList')
    await flushPromises()

    expect(wysiwygInsertTaskListMock).toHaveBeenCalledTimes(1)

    await wrapper.unmount()
  }, 15000)

  it('预览视图下应向顶部格式工具栏显示任务列表按钮', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const note = store.createNoteWithContent('')
    tabsStore.openTab(note.id)

    const wrapper = mount(WysiwygEditor, {
      props: { noteId: note.id },
      global: {
        plugins: [pinia],
        stubs: {
          FormatToolbar: FormatToolbarStub,
          FocusFormatToolbar: FocusFormatToolbarStub,
          TableToolbar: true,
        },
      },
    })

    await flushPromises()

    expect(wrapper.get('[data-testid="toolbar-stub"]').attributes('data-show-task-list')).toBe('true')

    await wrapper.unmount()
  })

  it('纯编辑视图保持现状，不渲染顶部格式工具栏任务列表按钮', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const note = store.createNoteWithContent('')
    tabsStore.openTab(note.id)

    const wrapper = mount(WysiwygEditor, {
      props: { noteId: note.id, focusMode: true },
      global: {
        plugins: [pinia],
        stubs: {
          FormatToolbar: FormatToolbarStub,
          FocusFormatToolbar: FocusFormatToolbarStub,
          TableToolbar: true,
        },
      },
    })

    await flushPromises()

    expect(wrapper.find('[data-testid="toolbar-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="focus-toolbar-stub"]').exists()).toBe(true)

    await wrapper.unmount()
  })
})

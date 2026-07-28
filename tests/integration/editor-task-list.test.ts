import { describe, expect, it, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { EditorSelection } from '@codemirror/state'
import Editor from '@/components/Editor.vue'
import { useEditorTabsStore } from '@/stores/editorTabs'
import { useNoteStore } from '@/stores/note'

function getEditorView(wrapper: InstanceType<typeof Editor> | any) {
  const view = (wrapper.vm as { view?: unknown }).view
  expect(view).toBeTruthy()
  return view as {
    state: {
      doc: { toString(): string }
      selection: { main: { from: number; to: number } }
    }
    dispatch(payload: Record<string, unknown>): void
  }
}

describe('Editor 任务列表插入', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('点击任务列表按钮后插入 3 条待办项并将光标定位到第一条内容起点', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const note = store.createNoteWithContent('hello')
    tabsStore.openTab(note.id)

    const wrapper = mount(Editor, {
      props: { noteId: note.id },
      global: { plugins: [pinia] },
    })

    const view = getEditorView(wrapper)
    view.dispatch({
      selection: EditorSelection.single(5),
    })

    await wrapper.get('[data-testid="toolbar-task-list"]').trigger('click')
    await flushPromises()

    expect(view.state.doc.toString()).toBe('hello\n- [ ] \n- [ ] \n- [ ] ')
    expect(view.state.selection.main.from).toBe(12)
    expect(view.state.selection.main.to).toBe(12)
  }, 15000)

  it('在行中间插入任务列表时应与后续正文断行，避免并入第三条任务', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const note = store.createNoteWithContent('hello world')
    tabsStore.openTab(note.id)

    const wrapper = mount(Editor, {
      props: { noteId: note.id },
      global: { plugins: [pinia] },
    })

    const view = getEditorView(wrapper)
    view.dispatch({
      selection: EditorSelection.single(5),
    })

    await wrapper.get('[data-testid="toolbar-task-list"]').trigger('click')
    await flushPromises()

    expect(view.state.doc.toString()).toBe('hello\n- [ ] \n- [ ] \n- [ ] \n world')
    expect(view.state.selection.main.from).toBe(12)
    expect(view.state.selection.main.to).toBe(12)
  })
})

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
      doc: { toString(): string; length: number }
      selection: { main: { from: number; to: number } }
    }
    dispatch(payload: Record<string, unknown>): void
  }
}

describe('Editor 高亮显示', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('选区点击高亮后应包裹为 ==文本==', async () => {
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
      selection: EditorSelection.single(0, 5),
    })

    await wrapper.get('[data-testid="toolbar-highlight"]').trigger('click')
    await flushPromises()

    expect(view.state.doc.toString()).toBe('==hello== world')
  })

  it('无选区点击高亮后应通过弹框插入高亮文本', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const note = store.createNoteWithContent('world')
    tabsStore.openTab(note.id)

    const wrapper = mount(Editor, {
      props: { noteId: note.id },
      global: { plugins: [pinia] },
    })

    const view = getEditorView(wrapper)
    view.dispatch({
      selection: EditorSelection.single(0),
    })

    await wrapper.get('[data-testid="toolbar-highlight"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="highlight-text-modal"]').exists()).toBe(true)

    await wrapper.get('[data-testid="highlight-text-input"]').setValue('重点')
    await wrapper.get('[data-testid="highlight-text-confirm"]').trigger('click')
    await flushPromises()

    expect(view.state.doc.toString()).toBe('==重点==world')
  })
})

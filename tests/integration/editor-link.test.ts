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
    }
    dispatch(payload: Record<string, unknown>): void
  }
}

describe('Editor 插入链接', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('空选区点击链接按钮后应通过弹框插入带 title 的 Markdown 链接', async () => {
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

    await wrapper.get('[aria-label="插入链接"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="link-dialog-text"]').exists()).toBe(true)
    expect((wrapper.get('[data-testid="link-dialog-text"]').element as HTMLInputElement).value).toBe('链接文字')

    await wrapper.get('[data-testid="link-dialog-url"]').setValue('https://openai.com')
    await wrapper.get('[data-testid="link-dialog-title"]').setValue('官网')
    await wrapper.get('[data-testid="link-dialog-confirm"]').trigger('click')
    await flushPromises()

    expect(view.state.doc.toString()).toBe('[链接文字](https://openai.com "官网")world')
  })
})

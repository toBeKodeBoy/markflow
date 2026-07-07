/**
 * WYSIWYG 集成测试挂载辅助
 */
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import WysiwygEditor from '@/components/WysiwygEditor.vue'
import { useNoteStore } from '@/stores/note'
import '@/stores/editorTabs'
import { useEditorTabsStore } from '@/stores/editorTabs'

export async function mountWysiwygEditor(content: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useNoteStore()
  const tabsStore = useEditorTabsStore()
  const note = store.createNoteWithContent(content)
  tabsStore.openTab(note.id)

  const wrapper = mount(WysiwygEditor, {
    props: { noteId: note.id },
    global: { plugins: [pinia] },
  })
  await flushPromises()
  await new Promise((r) => setTimeout(r, 1200))
  const prose = wrapper.element.querySelector('.ProseMirror')
  expect(prose).toBeTruthy()
  return { wrapper, prose: prose!, store, noteId: note.id }
}

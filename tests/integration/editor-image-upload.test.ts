import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { useNoteStore } from '@/stores/note'
import { useEditorTabsStore } from '@/stores/editorTabs'

const { handleImageInsertMock } = vi.hoisted(() => ({
  handleImageInsertMock: vi.fn(() => Promise.resolve(true)),
}))

vi.mock('@/utils/imageInsert', async () => {
  const actual = await vi.importActual<typeof import('@/utils/imageInsert')>('@/utils/imageInsert')
  return {
    ...actual,
    handleImageInsert: handleImageInsertMock,
  }
})

import Editor from '@/components/Editor.vue'

const FormatToolbarStub = defineComponent({
  emits: ['imageUpload'],
  template: '<div data-testid="toolbar-stub" />',
})

describe('Editor 图片上传接线', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    handleImageInsertMock.mockClear()
  })

  it('接收到工具栏 imageUpload 事件后调用 handleImageInsert', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const note = store.createNoteWithContent('# test')
    tabsStore.openTab(note.id)

    const wrapper = mount(Editor, {
      props: { noteId: note.id },
      global: {
        plugins: [pinia],
        stubs: {
          FormatToolbar: FormatToolbarStub,
        },
      },
    })

    const file = new File(['editor'], 'editor.png', { type: 'image/png' })
    wrapper.getComponent(FormatToolbarStub).vm.$emit('imageUpload', file)
    await flushPromises()

    expect(handleImageInsertMock).toHaveBeenCalledTimes(1)
    expect(handleImageInsertMock).toHaveBeenCalledWith(file, expect.any(Function))
  })
})

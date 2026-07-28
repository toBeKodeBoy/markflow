import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { useNoteStore } from '@/stores/note'
import { useEditorTabsStore } from '@/stores/editorTabs'

const { insertWysiwygImageMock } = vi.hoisted(() => ({
  insertWysiwygImageMock: vi.fn(() => Promise.resolve(true)),
}))

vi.mock('@/utils/imageCompress', () => ({
  compressImage: vi.fn(async (input: File | Blob) => ({
    blob: input instanceof Blob ? input : new Blob(['mock'], { type: 'image/png' }),
    mimeType: 'image/png',
    width: 8,
    height: 8,
    size: input.size || 4,
  })),
}))

vi.mock('@/plugins/imagePaste', async () => {
  const actual = await vi.importActual<typeof import('@/plugins/imagePaste')>('@/plugins/imagePaste')
  return {
    ...actual,
    insertWysiwygImage: insertWysiwygImageMock,
  }
})

import WysiwygEditor from '@/components/WysiwygEditor.vue'

const FormatToolbarStub = defineComponent({
  emits: ['imageUpload'],
  template: '<div data-testid="toolbar-stub" />',
})

const FocusFormatToolbarStub = defineComponent({
  props: { visible: { type: Boolean, default: true } },
  emits: ['imageUpload', 'mouseenter', 'mouseleave'],
  template: '<div data-testid="focus-toolbar-stub" />',
})

describe('WysiwygEditor 图片上传接线', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    insertWysiwygImageMock.mockClear()
  })

  it('普通工具栏 imageUpload 会调用共享 WYSIWYG 图片插入逻辑', async () => {
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

    const file = new File(['image'], 'inline.png', { type: 'image/png' })
    wrapper.getComponent(FormatToolbarStub).vm.$emit('imageUpload', file)

    await flushPromises()

    expect(insertWysiwygImageMock).toHaveBeenCalledTimes(1)
    expect(insertWysiwygImageMock.mock.calls[0]?.[2]).toBe(file)

    await wrapper.unmount()
  }, 15000)

  it('专注模式工具栏 imageUpload 也会调用共享 WYSIWYG 图片插入逻辑', async () => {
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
    await new Promise((resolve) => setTimeout(resolve, 1200))

    const file = new File(['focus'], 'focus-inline.png', { type: 'image/png' })
    wrapper.getComponent(FocusFormatToolbarStub).vm.$emit('imageUpload', file)

    await flushPromises()

    expect(insertWysiwygImageMock).toHaveBeenCalledTimes(1)
    expect(insertWysiwygImageMock.mock.calls[0]?.[2]).toBe(file)

    await wrapper.unmount()
  }, 15000)
})

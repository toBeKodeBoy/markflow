import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import Toolbar from '../../../src/components/Toolbar.vue'
import { useNoteStore } from '../../../src/stores/note'
import { useEditorTabsStore } from '../../../src/stores/editorTabs'

let pinia: Pinia

function mountToolbar() {
  return mount(Toolbar, {
    props: {
      viewMode: 'live',
      tocVisible: false,
    },
    global: {
      plugins: [pinia],
      stubs: {
        PdfExportModal: true,
        SettingsModal: true,
        ImportFolderModal: true,
        AppIcon: true,
      },
    },
  })
}

describe('Toolbar', () => {
  let originalMarkflow: typeof window.markflow | undefined
  let originalFileReader: typeof window.FileReader

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    pinia = createPinia()
    setActivePinia(pinia)
    originalMarkflow = window.markflow
    originalFileReader = window.FileReader
  })

  afterEach(() => {
    if (originalMarkflow) {
      window.markflow = originalMarkflow
    } else {
      delete (window as Partial<Window>).markflow
    }
    window.FileReader = originalFileReader
    vi.restoreAllMocks()
  })

  it('单文件导入后应新开并激活对应标签页', async () => {
    vi.mocked(window.markflow.openMarkdownFile).mockReturnValue({
      content: '# Imported Title\nbody',
      path: 'D:\\docs\\imported.md',
      name: 'imported.md',
      images: [],
    })

    const wrapper = mountToolbar()
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()

    await wrapper.find('.btn-icon.btn-icon-text').trigger('click')
    await wrapper
      .findAll('[role="menuitem"]')
      .find((button) => button.text().includes('导入文件'))!
      .trigger('click')
    await flushPromises()

    expect(noteStore.currentNote?.title).toBe('Imported Title')
    expect(noteStore.currentNote?.sourceFilePath).toBe('D:\\docs\\imported.md')
    expect(tabsStore.activeTabId).toBe(noteStore.currentNote?.id ?? null)
    expect(tabsStore.tabs).toHaveLength(1)
    expect(tabsStore.tabs[0]?.noteId).toBe(noteStore.currentNote?.id)
  })

  it('浏览器单文件导入遇到本地图片时应提示改用导入文件夹', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const fakeInput = {
      type: '',
      accept: '',
      files: [{ name: 'imported.md' }],
      onchange: null as ((event: Event) => void) | null,
      click() {
        this.onchange?.({ target: this } as unknown as Event)
      },
    }

    class MockFileReader {
      result: string | ArrayBuffer | null = null
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null
      readAsText() {
        this.result = '# Imported\n\n![图](assets/image.png)'
        this.onload?.({ target: this } as ProgressEvent<FileReader>)
      }
    }

    delete (window as Partial<Window>).markflow
    const realCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'input') return fakeInput as unknown as HTMLInputElement
      return realCreateElement(tagName)
    })
    window.FileReader = MockFileReader as unknown as typeof FileReader

    const wrapper = mountToolbar()
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const createNoteSpy = vi.spyOn(noteStore, 'createNoteWithContent')

    await wrapper.find('.btn-icon.btn-icon-text').trigger('click')
    await wrapper
      .findAll('[role="menuitem"]')
      .find((button) => button.text().includes('导入文件'))!
      .trigger('click')
    await flushPromises()

    expect(alertSpy).toHaveBeenCalledWith(
      '浏览器环境下，含本地图片的 Markdown 请使用“导入文件夹”'
    )
    expect(createNoteSpy).not.toHaveBeenCalled()
    expect(tabsStore.tabs).toHaveLength(0)
  })
})

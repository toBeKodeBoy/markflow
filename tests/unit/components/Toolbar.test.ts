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

    expect(noteStore.currentNote?.title).toBe('imported')
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

  it('浏览器单文件导入应使用文件名作为标题', async () => {
    const fakeInput = {
      type: '',
      accept: '',
      files: [{ name: 'meeting-notes.md' }],
      onchange: null as ((event: Event) => void) | null,
      click() {
        this.onchange?.({ target: this } as unknown as Event)
      },
    }

    class MockFileReader {
      result: string | ArrayBuffer | null = null
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null
      readAsText() {
        this.result = '前言\n\n没有一级标题'
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

    await wrapper.find('.btn-icon.btn-icon-text').trigger('click')
    await wrapper
      .findAll('[role="menuitem"]')
      .find((button) => button.text().includes('导入文件'))!
      .trigger('click')
    await flushPromises()

    expect(noteStore.currentNote?.title).toBe('meeting-notes')
  })

  it('点击顶部新建按钮应打开统一创建弹层', async () => {
    const wrapper = mountToolbar()

    await wrapper.find('.btn-action').trigger('click')

    expect(wrapper.text()).toContain('新建内容')
    expect(wrapper.text()).toContain('新建文件')
    expect(wrapper.text()).toContain('新建文件夹')
  })

  it('顶部新建切换目标目录后应同步更新当前目录', async () => {
    const wrapper = mountToolbar()
    const noteStore = useNoteStore()
    const targetFolder = noteStore.createFolder('目标目录')

    await wrapper.find('.btn-action').trigger('click')
    await flushPromises()
    await wrapper.find('.create-entry-select').setValue(targetFolder.id)
    await wrapper.find('form').trigger('submit.prevent')

    expect(noteStore.currentNote?.folderId).toBe(targetFolder.id)
    expect(noteStore.activeFolderId).toBe(targetFolder.id)
  })

  it('顶栏新建文件夹后应选中新文件夹并持久化侧边栏状态', async () => {
    const wrapper = mountToolbar()
    const noteStore = useNoteStore()
    const parentFolder = noteStore.createFolder('父目录')
    noteStore.activeFolderId = parentFolder.id

    await wrapper.find('.btn-action').trigger('click')
    await flushPromises()
    await wrapper.findAll('.create-entry-kind-card')[1].trigger('click')
    await wrapper.find('.create-entry-input').setValue('子目录')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    const createdFolder = noteStore.folderList.find(
      (folder) => folder.name === '子目录' && folder.parentId === parentFolder.id
    )

    expect(createdFolder).toBeTruthy()
    expect(noteStore.activeFolderId).toBe(createdFolder?.id)

    const settings = JSON.parse(localStorage.getItem('markflow_settings') ?? '{}')
    expect(settings.sidebarActiveFolderId).toBe(createdFolder?.id)
    expect(settings.sidebarExpandedFolderIds).toEqual(
      expect.arrayContaining([parentFolder.id, createdFolder!.id])
    )
  })
})

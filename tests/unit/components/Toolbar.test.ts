import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import Toolbar from '../../../src/components/Toolbar.vue'
import { useNoteStore } from '../../../src/stores/note'
import { useEditorTabsStore } from '../../../src/stores/editorTabs'

let pinia: Pinia

const { exportMarkdownAssetsMock } = vi.hoisted(() => ({
  exportMarkdownAssetsMock: vi.fn(async ({ markdown }: { markdown: string }) => ({
    markdown: `${markdown}\nexported`,
    exportedCount: 1,
    warnings: [],
  })),
}))

vi.mock('../../../src/utils/exportMarkdownAssets', () => ({
  DEFAULT_IMAGE_EXPORT_SETTINGS: {
    mode: 'note-assets-folder',
    customTemplate: './${filename}.assets',
    fileNameTemplate: '${filename}-${index}',
    overwriteStrategy: 'rename',
    bindNoteOnExport: true,
    downloadRemoteImages: true,
    syncUnusedAssets: true,
    unusedAssetsFolderName: '_unused',
  },
  exportMarkdownAssets: exportMarkdownAssetsMock,
}))

function mountToolbar() {
  return mount(Toolbar, {
    props: {
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

async function openFileMenu(wrapper: ReturnType<typeof mountToolbar>) {
  await wrapper.find('[data-testid="toolbar-overflow-btn"]').trigger('click')
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

    await openFileMenu(wrapper)
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

    await openFileMenu(wrapper)
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

    await openFileMenu(wrapper)
    await wrapper
      .findAll('[role="menuitem"]')
      .find((button) => button.text().includes('导入文件'))!
      .trigger('click')
    await flushPromises()

    expect(noteStore.currentNote?.title).toBe('meeting-notes')
  })

  it('顶栏命令条有搜索条与历史按钮，无 Logo 和新建主按钮', () => {
    const wrapper = mountToolbar()

    expect(wrapper.find('[data-testid="toolbar-search-bar"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="toolbar-search-bar"]').text()).toContain('搜索笔记')
    expect(wrapper.find('[data-testid="toolbar-history-back"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="toolbar-history-forward"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="toolbar-history-back"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="toolbar-history-forward"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.app-logo').exists()).toBe(false)
    expect(wrapper.find('[aria-label="新建笔记"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="设置"]').exists()).toBe(false)
  })

  it('顶栏不应再展示主题快捷切换按钮', () => {
    const wrapper = mountToolbar()

    expect(wrapper.find('[title="切换主题"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="切换主题"]').exists()).toBe(false)
  })

  it('uTools 导出 Markdown 时应先导出图片并写入最终内容', async () => {
    vi.mocked(window.markflow.selectMarkdownSavePath).mockReturnValue({
      ok: true,
      path: 'D:\\docs\\note.md',
    })

    const wrapper = mountToolbar()
    const noteStore = useNoteStore()
    const note = noteStore.createNote()
    noteStore.currentNote = note
    noteStore.liveContent = '![图](markflow-asset://asset-1)'

    await openFileMenu(wrapper)
    await wrapper
      .findAll('[role="menuitem"]')
      .find((button) => button.text().includes('导出 Markdown'))!
      .trigger('click')
    await flushPromises()

    expect(window.markflow.selectMarkdownSavePath).toHaveBeenCalled()
    expect(exportMarkdownAssetsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        markdown: '![图](markflow-asset://asset-1)',
        markdownFilePath: 'D:\\docs\\note.md',
      })
    )
    expect(window.markflow.writeTextFile).toHaveBeenCalledWith(
      'D:\\docs\\note.md',
      '![图](markflow-asset://asset-1)\nexported'
    )
  })
  it('导出成功后应将当前笔记回写为文件路径并绑定工作文件', async () => {
    exportMarkdownAssetsMock.mockResolvedValueOnce({
      markdown: '![图](./note.assets/demo-1.png)',
      exportedCount: 1,
      warnings: [],
    })
    vi.mocked(window.markflow.selectMarkdownSavePath).mockReturnValue({
      ok: true,
      path: 'D:\\docs\\note.md',
    })

    const wrapper = mountToolbar()
    const noteStore = useNoteStore()
    const note = noteStore.createNote()
    noteStore.currentNote = note
    noteStore.liveContent = '![图](markflow-asset://asset-1)'

    await openFileMenu(wrapper)
    await wrapper
      .findAll('[role="menuitem"]')
      .find((button) => button.text().includes('导出 Markdown'))!
      .trigger('click')
    await flushPromises()

    expect(noteStore.currentNote?.content).toBe('![图](./note.assets/demo-1.png)')
    expect(noteStore.currentNote?.workingFilePath).toBe('D:\\docs\\note.md')
    expect(noteStore.currentNote?.assetDirectoryPath).toBe('D:\\docs\\note.assets')
    expect(noteStore.currentNote?.assetPathMode).toBe('file-bound')

    const saved = window.markflow.getNote(note.id)
    expect(saved?.content).toBe('![图](./note.assets/demo-1.png)')
    expect(saved?.workingFilePath).toBe('D:\\docs\\note.md')
    expect(saved?.assetDirectoryPath).toBe('D:\\docs\\note.assets')
    expect(saved?.assetPathMode).toBe('file-bound')
  })
  it('外链图片下载失败时应给出明确提示并保留原链接说明', async () => {
    exportMarkdownAssetsMock.mockResolvedValueOnce({
      markdown: '![remote](https://example.com/a.png)',
      exportedCount: 0,
      warnings: [
        '外链图片下载失败：https://example.com/a.png（HTTP 404）',
        '外链图片下载失败：https://example.com/b.png（HTTP 403）',
      ],
    })
    vi.mocked(window.markflow.selectMarkdownSavePath).mockReturnValue({
      ok: true,
      path: 'D:\\docs\\note.md',
    })

    const wrapper = mountToolbar()
    const noteStore = useNoteStore()
    const note = noteStore.createNote()
    noteStore.currentNote = note
    noteStore.liveContent = '![remote](https://example.com/a.png)'

    await openFileMenu(wrapper)
    await wrapper
      .findAll('[role="menuitem"]')
      .find((button) => button.text().includes('导出 Markdown'))!
      .trigger('click')
    await flushPromises()

    expect(window.markflow.showNotification).toHaveBeenCalledWith(
      '导出完成，但有 2 张外链图片下载失败，已保留原链接。外链图片下载失败：https://example.com/a.png（HTTP 404）；另有 1 条同类问题'
    )
  })

  it('点击搜索条应派发 openSearch', async () => {
    const wrapper = mountToolbar()
    const btn = wrapper.find('[data-testid="toolbar-search-bar"]')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('aria-label')).toBe('搜索笔记')
    expect(btn.attributes('title')).toMatch(/Ctrl\+K|Cmd\+K|搜索/)

    await btn.trigger('click')
    expect(wrapper.emitted('openSearch')).toEqual([[]])
  })

  it('打开两篇笔记后顶栏后退可切回上一篇', async () => {
    const wrapper = mountToolbar()
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const a = noteStore.createNoteWithContent('# Hist A\n')
    const b = noteStore.createNoteWithContent('# Hist B\n')

    tabsStore.openTab(a.id)
    tabsStore.openTab(b.id)
    await flushPromises()

    const back = wrapper.find('[data-testid="toolbar-history-back"]')
    expect(back.attributes('disabled')).toBeUndefined()
    await back.trigger('click')
    await flushPromises()

    expect(tabsStore.activeTabId).toBe(a.id)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNoteStore } from '../../../src/stores/note'
import { useEditorTabsStore } from '../../../src/stores/editorTabs'
import { useAppSettings } from '../../../src/composables/useAppSettings'
import { importExampleLibrary } from '../../../src/utils/exampleLibrary'
import { EXAMPLE_LIBRARY, EXAMPLE_LIBRARY_FOLDER_NAMES } from '../../../src/constants/exampleLibrary'
import { MY_FOLDER_ID } from '../../../src/constants/myFolder'

describe('importExampleLibrary', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    useAppSettings().load()
  })

  it('创建三个示例文件夹与约定笔记，并打开提示词模板示例', () => {
    const result = importExampleLibrary()
    const store = useNoteStore()
    const tabsStore = useEditorTabsStore()

    const names = store.folderList.map((folder) => folder.name)
    expect(names).toEqual(expect.arrayContaining([...EXAMPLE_LIBRARY_FOLDER_NAMES]))
    expect(store.noteList.length).toBeGreaterThanOrEqual(6)
    expect(store.currentNote?.title).toBe('提示词模板示例')
    expect(tabsStore.activeTabId).toBe(result.openedNoteId)
    expect(useAppSettings().get().exampleLibraryImported).toBe(true)
    const settings = useAppSettings().get()
    expect(settings.sidebarExpandedFolderIds ?? []).toEqual(expect.arrayContaining([MY_FOLDER_ID]))
    expect(settings.sidebarExpandedSpaceIds ?? []).toEqual(expect.arrayContaining([MY_FOLDER_ID]))
    expect((settings.sidebarExpandedSpaceIds ?? []).every((id) => !id.includes('/'))).toBe(true)
    expect((settings.sidebarExpandedSpaceIds ?? []).every((id) => !id.includes('recent'))).toBe(true)
  })

  it('教程正文用「我的空间」描述侧栏，不再出现「我的文件夹」', () => {
    const contents = EXAMPLE_LIBRARY.flatMap((folder) => folder.notes.map((note) => note.content)).join('\n')
    expect(contents).toContain('我的空间')
    expect(contents).not.toContain('我的文件夹')
  })

  it('第二次调用不复制文件夹', () => {
    importExampleLibrary()
    const store = useNoteStore()
    const folderCount = store.folderList.length
    const noteCount = store.noteList.length

    const again = importExampleLibrary()

    expect(again.created).toBe(false)
    expect(store.folderList).toHaveLength(folderCount)
    expect(store.noteList).toHaveLength(noteCount)
  })

  it('示例文件夹仍在但笔记被删后再次导入应补回缺失笔记', () => {
    importExampleLibrary()
    const store = useNoteStore()
    const target = store.noteList.find((item) => item.title === '接口文档示例')
    expect(target).toBeTruthy()
    store.deleteNote(target!.id)
    expect(store.noteList.some((item) => item.title === '接口文档示例')).toBe(false)

    const result = importExampleLibrary()

    expect(result.created).toBe(true)
    expect(store.noteList.some((item) => item.title === '接口文档示例')).toBe(true)
    expect(store.folderList.filter((folder) => !folder.parentId)).toHaveLength(3)
  })
})

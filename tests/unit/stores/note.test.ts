import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNoteStore } from '../../../src/stores/note'

describe('useNoteStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('初始化状态正确', () => {
    const store = useNoteStore()
    expect(store.noteList).toEqual([])
    expect(store.currentNote).toBeNull()
    expect(store.liveContent).toBe('')
    expect(store.folderList).toEqual([])
    expect(store.searchQuery).toBe('')
    expect(store.activeFolderId).toBeNull()
    expect(store.tocVisible).toBe(false)
    expect(store.pendingLargeFileSwitch).toBe(false)
  })

  it('createNote 会创建默认笔记并设为当前笔记', () => {
    const store = useNoteStore()
    const note = store.createNote()
    expect(note.title).toBeTruthy()
    expect(store.currentNote?.id).toBe(note.id)
    expect(store.noteList).toHaveLength(1)
  })

  it('createNoteWithContent 会提取标题并更新搜索索引', () => {
    const store = useNoteStore()
    const note = store.createNoteWithContent('# Alpha\nbody')
    expect(note.title).toBe('Alpha')
    expect(store.contentSearchIndex[note.id]).toContain('body')
  })

  it('openNote 会把笔记加载到 currentNote 和 liveContent', () => {
    const store = useNoteStore()
    const note = store.createNoteWithContent('# Alpha\nbody')
    store.setActiveNote(null, '')
    store.openNote(note.id)
    expect(store.currentNote?.id).toBe(note.id)
    expect(store.liveContent).toContain('body')
  })

  it('updateCurrentContent 会持久化正文并同步标题', () => {
    const store = useNoteStore()
    store.createNoteWithContent('# Old\nbody')
    store.updateCurrentContent('# New\ncontent')
    expect(store.currentNote?.title).toBe('New')
    expect(store.liveContent).toContain('content')
  })

  it('toggleNotePinned 会切换置顶状态', () => {
    const store = useNoteStore()
    const note = store.createNote()
    store.toggleNotePinned(note.id)
    expect(store.noteList.find((n) => n.id === note.id)?.pinned).toBe(true)
  })

  it('reorderNotes 会更新同级 sortOrder', () => {
    const store = useNoteStore()
    const folder = store.createFolder('工作')
    const a = store.createNoteWithContent('# A', folder.id)
    const b = store.createNoteWithContent('# B', folder.id)
    const c = store.createNoteWithContent('# C', folder.id)

    store.reorderNotes(folder.id, [c.id, a.id, b.id])

    const inFolder = store.noteList
      .filter((n) => n.folderId === folder.id)
      .sort((x, y) => (x.sortOrder ?? 0) - (y.sortOrder ?? 0))
    expect(inFolder.map((n) => n.id)).toEqual([c.id, a.id, b.id])
  })

  it('searchQuery 会按标题过滤', () => {
    const store = useNoteStore()
    store.createNoteWithContent('# Alpha')
    store.createNoteWithContent('# Beta')
    store.searchQuery = 'beta'
    expect(store.filteredNoteList).toHaveLength(1)
    expect(store.filteredNoteList[0].title).toBe('Beta')
  })

  it('searchQuery 会按正文过滤', () => {
    const store = useNoteStore()
    store.createNoteWithContent('# 标题A\n唯一关键词xyz')
    store.createNoteWithContent('# 标题B\n普通内容')
    store.searchQuery = 'xyz'
    expect(store.filteredNoteList).toHaveLength(1)
    expect(store.filteredNoteList[0].title).toBe('标题A')
  })

  it('activeFolderId 与 searchQuery 会叠加过滤', () => {
    const store = useNoteStore()
    store.createNoteWithContent('# Match', 'f1')
    store.createNoteWithContent('# Match too', 'f2')
    store.searchQuery = 'match'
    store.activeFolderId = 'f1'
    expect(store.filteredNoteList).toHaveLength(1)
    expect(store.filteredNoteList[0].title).toBe('Match')
  })

  it('renameFolder 会更新名称', () => {
    const store = useNoteStore()
    const folder = store.createFolder('旧名')
    store.renameFolder(folder.id, '新名')
    expect(store.folderList[0].name).toBe('新名')
  })

  it('clearAllLibraryData 会清空笔记和文件夹', async () => {
    const store = useNoteStore()
    store.createFolder('docs')
    store.createNoteWithContent('# A')
    await store.clearAllLibraryData()
    expect(store.noteList).toEqual([])
    expect(store.folderList).toEqual([])
    expect(store.currentNote).toBeNull()
  })

  it('batchImportFromFolder 会增量更新 noteList 并写入搜索索引', async () => {
    const store = useNoteStore()
    const lengths: number[] = []

    const result = await store.batchImportFromFolder(
      {
        rootPath: '/tmp/demo',
        files: [
          { relativePath: 'a.md', content: '# Alpha\nsearch-token-a', images: [] },
          { relativePath: 'b.md', content: '# Beta\nsearch-token-b', images: [] },
        ],
      },
      {
        preserveStructure: false,
        onConflict: 'rename',
        importImages: false,
        replaceExisting: false,
        selectedPaths: null,
      },
      () => {
        lengths.push(store.noteList.length)
      }
    )

    expect(result.imported).toBe(2)
    expect(store.noteList.length).toBe(2)
    expect(store.noteList.map((n) => n.title).sort()).toEqual(['a', 'b'])
    const ids = store.noteList.map((n) => n.id)
    expect(store.contentSearchIndex[ids[0]] || store.contentSearchIndex[ids[1]]).toBeTruthy()
    expect(
      Object.values(store.contentSearchIndex).some((t) => t.includes('search-token-a'))
    ).toBe(true)
  })
})

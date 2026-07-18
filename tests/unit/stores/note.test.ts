/**
 * Pinia Store 测试 — 验证笔记 CRUD、文件夹管理、搜索过滤、TOC 跳转
 * @file tests/unit/stores/note.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNoteStore } from '../../../src/stores/note'
import { useEditorTabsStore } from '../../../src/stores/editorTabs'

function makeNote(overrides = {}) {
  return {
    id: 'n1', title: '测试笔记', content: '# 测试\n内容',
    folderId: undefined, tags: [], createdAt: 1000, updatedAt: 1001,
    ...overrides,
  }
}

describe('useNoteStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  // ===== 初始化 =====
  describe('初始化', () => {
    it('初始状态正确', () => {
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
  })

  // ===== 创建笔记 =====
  describe('createNote', () => {
    it('createNote 应创建新笔记', () => {
      const store = useNoteStore()
      const note = store.createNote()
      expect(note).toHaveProperty('id')
      expect(note.title).toBe('无标题')
      expect(note.content).toBe('# 无标题\n\n')
      expect(store.currentNote?.id).toBe(note.id)
      expect(store.liveContent).toBe(note.content)
      expect(store.noteList).toHaveLength(1)
    })

    it('createNote 应关联文件夹', () => {
      const store = useNoteStore()
      const note = store.createNote('folder_1')
      expect(note.folderId).toBe('folder_1')
    })

    it('createNoteWithContent 应从内容提取标题', () => {
      const store = useNoteStore()
      const note = store.createNoteWithContent('# 我的标题\n正文')
      expect(note.title).toBe('我的标题')
    })

    it('createNoteWithContent 应标记大文件', () => {
      const store = useNoteStore()
      const bigContent = 'x'.repeat(200_001)
      store.createNoteWithContent(bigContent)
      expect(store.pendingLargeFileSwitch).toBe(true)
    })
  })

  // ===== 打开/切换笔记 =====
  describe('openNote', () => {
    it('openNote 应加载笔记到当前状态', () => {
      const store = useNoteStore()
      store.createNoteWithContent('# Initial')
      const id = store.currentNote!.id

      // 先更新内容再重新打开
      store.setLiveContent('updated')
      store.openNote(id)
      expect(store.liveContent).toContain('Initial')
    })

    it('openNote 对不存在 id 应无操作', () => {
      const store = useNoteStore()
      store.openNote('nonexistent')
      expect(store.currentNote).toBeNull()
    })
  })

  // ===== 更新内容 =====
  describe('updateCurrentContent', () => {
    it('应同步更新 content、title、liveContent', () => {
      const store = useNoteStore()
      store.createNote()
      store.updateCurrentContent('# 新标题\n正文内容')
      expect(store.currentNote!.title).toBe('新标题')
      expect(store.currentNote!.content).toBe('# 新标题\n正文内容')
      expect(store.liveContent).toBe('# 新标题\n正文内容')
    })

    it('应更新 noteList 中的标题', () => {
      const store = useNoteStore()
      store.createNote()
      store.updateCurrentContent('# 更新后标题')
      expect(store.noteList[0].title).toBe('更新后标题')
    })

    it('当 currentNote 为 null 时不应操作', () => {
      const store = useNoteStore()
      store.updateCurrentContent('内容')
      expect(store.currentNote).toBeNull()
    })
  })

  // ===== 删除笔记 =====
  describe('deleteNote', () => {
    it('删除当前笔记后应自动切换到第一个笔记', () => {
      const store = useNoteStore()
      const tabsStore = useEditorTabsStore()
      const n1 = store.createNoteWithContent('# A')
      const n2 = store.createNoteWithContent('# B')
      tabsStore.openTab(n1.id)
      tabsStore.openTab(n2.id)
      store.deleteNote(n1.id)
      expect(store.currentNote?.id).toBe(n2.id)
    })

    it('删除最后一个笔记后应自动创建 welcome 笔记', () => {
      const store = useNoteStore()
      const tabsStore = useEditorTabsStore()
      store.createNote()
      tabsStore.openTab(store.currentNote!.id)
      store.deleteNote(store.currentNote!.id)
      expect(store.currentNote).not.toBeNull()
      expect(store.currentNote?.content).toContain('欢迎使用 MarkFlow')
    })
  })

  // ===== 重命名 =====
  describe('renameNote', () => {
    it('renameNote 应更新标题', () => {
      const store = useNoteStore()
      store.createNote()
      store.renameNote(store.currentNote!.id, '改名了')
      expect(store.currentNote!.title).toBe('改名了')
      expect(store.noteList[0].title).toBe('改名了')
    })
  })

  describe('imported note title', () => {
    it('importMarkdownFile 应优先使用文件名作为标题', async () => {
      const store = useNoteStore()
      const result = await store.importMarkdownFile({
        content: '# Project Title\n\nbody',
        path: 'D:\\docs\\imported.md',
        name: 'imported.md',
        images: [],
      })

      expect(result.note.title).toBe('imported')
      expect(store.currentNote?.title).toBe('imported')
    })

    it('单文件导入后更新正文不应覆盖文件名标题', async () => {
      const store = useNoteStore()
      await store.importMarkdownFile({
        content: '# Project Title\n\nbody',
        path: 'D:\\docs\\imported.md',
        name: 'imported.md',
        images: [],
      })

      store.updateCurrentContent('# Changed Title\n\nbody edited')
      expect(store.currentNote?.title).toBe('imported')
    })

    it('兼容历史导入笔记：旧数据更新正文时仍应保持文件名标题', () => {
      const legacyNote = makeNote({
        id: 'legacy-imported',
        title: 'readme',
        content: '# Project Title\n\nbody',
        importSourcePath: 'docs/readme.md',
      })
      localStorage.setItem(
        'markflow_note_list',
        JSON.stringify([{ id: legacyNote.id, title: legacyNote.title, updatedAt: legacyNote.updatedAt }])
      )
      localStorage.setItem(`markflow_note_${legacyNote.id}`, JSON.stringify(legacyNote))

      const store = useNoteStore()
      store.loadNoteList()
      store.openNote(legacyNote.id)

      store.updateCurrentContent('# Changed Title\n\nbody edited')
      expect(store.currentNote?.title).toBe('readme')
    })

    it('updateCurrentContent 不应覆盖导入笔记的文件名标题', async () => {
      const store = useNoteStore()
      await store.batchImportFromFolder(
        {
          rootPath: '/tmp/lib',
          files: [{ relativePath: 'readme.md', content: '# Project Title\n\nbody', images: [] }],
        },
        { preserveStructure: true, onConflict: 'rename', importImages: false, replaceExisting: false, selectedPaths: null }
      )
      expect(store.currentNote?.title).toBe('readme')
      store.updateCurrentContent('# Project Title\n\nbody edited')
      expect(store.currentNote?.title).toBe('readme')
    })

    it('renameNote 后应恢复从正文提取标题', async () => {
      const store = useNoteStore()
      await store.batchImportFromFolder(
        {
          rootPath: '/tmp/lib',
          files: [{ relativePath: 'readme.md', content: '# Title\n\n', images: [] }],
        },
        { preserveStructure: true, onConflict: 'rename', importImages: false, replaceExisting: false, selectedPaths: null }
      )
      const id = store.currentNote!.id
      store.renameNote(id, 'custom')
      store.updateCurrentContent('# New Heading\n\n')
      expect(store.currentNote?.title).toBe('New Heading')
    })

    it('单文件导入重命名后应恢复从正文提取标题', async () => {
      const store = useNoteStore()
      const result = await store.importMarkdownFile({
        content: '# Title\n\nbody',
        path: 'D:\\docs\\imported.md',
        name: 'imported.md',
        images: [],
      })

      store.renameNote(result.note.id, 'custom')
      store.updateCurrentContent('# New Heading\n\nbody edited')
      expect(store.currentNote?.title).toBe('New Heading')
    })
  })

  // ===== 移动笔记 =====
  describe('moveNote', () => {
    it('应将笔记移动到指定文件夹', () => {
      const store = useNoteStore()
      const folder = store.createFolder('工作')
      store.createNoteWithContent('# A')
      const id = store.currentNote!.id

      store.moveNote(id, folder.id)

      expect(store.currentNote!.folderId).toBe(folder.id)
      expect(store.noteList.find(n => n.id === id)?.folderId).toBe(folder.id)
    })

    it('应将笔记移回无文件夹', () => {
      const store = useNoteStore()
      const folder = store.createFolder('工作')
      store.createNoteWithContent('# A', folder.id)
      const id = store.currentNote!.id

      store.moveNote(id, undefined)

      expect(store.currentNote!.folderId).toBeUndefined()
      expect(store.noteList.find(n => n.id === id)?.folderId).toBeUndefined()
    })

    it('移动到同一文件夹时应更新 sortOrder', () => {
      const store = useNoteStore()
      const folder = store.createFolder('工作')
      store.createNoteWithContent('# A', folder.id)
      const id = store.currentNote!.id
      const before = store.noteList.find((n) => n.id === id)?.sortOrder

      store.moveNote(id, folder.id)

      expect(store.currentNote!.folderId).toBe(folder.id)
      expect(store.noteList.find((n) => n.id === id)?.sortOrder).toBeGreaterThan(before ?? 0)
    })

    it('移动当前笔记时应同步 currentNote.folderId', () => {
      const store = useNoteStore()
      const f1 = store.createFolder('A')
      const f2 = store.createFolder('B')
      store.createNoteWithContent('# Note', f1.id)
      const id = store.currentNote!.id

      store.moveNote(id, f2.id)

      expect(store.currentNote!.id).toBe(id)
      expect(store.currentNote!.folderId).toBe(f2.id)
    })
  })

  // ===== 文件夹 =====
  describe('文件夹管理', () => {
    it('createFolder 应创建文件夹', () => {
      const store = useNoteStore()
      const f = store.createFolder('工作')
      expect(f.name).toBe('工作')
      expect(store.folderList).toHaveLength(1)
    })

    it('deleteFolder 应移除文件夹并清除 activeFolderId', () => {
      const store = useNoteStore()
      const f = store.createFolder('临时')
      store.activeFolderId = f.id
      store.deleteFolder(f.id)
      expect(store.folderList).toHaveLength(0)
      expect(store.activeFolderId).toBeNull()
    })

    it('deleteFolder 应将文件夹内笔记移回根目录', () => {
      const store = useNoteStore()
      const f = store.createFolder('工作')
      const note = store.createNote(f.id)
      store.deleteFolder(f.id)
      expect(store.folderList).toHaveLength(0)
      const saved = store.noteList.find(n => n.id === note.id)
      expect(saved?.folderId).toBeUndefined()
      expect(store.currentNote?.folderId).toBeUndefined()
    })

    it('deleteFolder 子文件夹笔记应移入父文件夹', () => {
      const store = useNoteStore()
      const parent = store.createFolder('docs')
      const child = store.createFolder('api', parent.id)
      const note = store.createNote(child.id)
      store.deleteFolder(child.id)
      expect(store.folderList.some((f) => f.id === child.id)).toBe(false)
      expect(store.noteList.find((n) => n.id === note.id)?.folderId).toBe(parent.id)
    })

    it('moveFolder 应更新 parentId 并拒绝形成环', () => {
      const store = useNoteStore()
      const a = store.createFolder('a')
      const b = store.createFolder('b', a.id)
      expect(store.moveFolder(a.id, b.id)).toBe(false)
      expect(store.moveFolder(b.id, undefined)).toBe(true)
      expect(store.folderList.find((f) => f.id === b.id)?.parentId).toBeUndefined()
    })

    it('createFolder 同级 order 递增', () => {
      const store = useNoteStore()
      const a = store.createFolder('a')
      const b = store.createFolder('b')
      expect(b.order).toBeGreaterThan(a.order)
    })

    it('toggleNotePinned 应切换置顶', () => {
      const store = useNoteStore()
      const note = store.createNote()
      store.toggleNotePinned(note.id)
      expect(store.noteList.find((n) => n.id === note.id)?.pinned).toBe(true)
    })

    it('addTag 应添加规范化后的标签', () => {
      const store = useNoteStore()
      const note = store.createNote()
      expect(store.addTag(note.id, '  API  ')).toBe(true)
      expect(store.currentNote?.tags).toEqual(['API'])
      expect(store.allTags).toEqual(['API'])
    })

    it('addTag 拒绝重复与超长标签', () => {
      const store = useNoteStore()
      const note = store.createNote()
      store.addTag(note.id, 'work')
      expect(store.addTag(note.id, 'WORK')).toBe(false)
      expect(store.addTag(note.id, 'x'.repeat(21))).toBe(false)
    })

    it('removeTag 应删除标签（大小写不敏感）', () => {
      const store = useNoteStore()
      const note = store.createNote()
      store.setNoteTags(note.id, ['Draft', 'API'])
      store.removeTag(note.id, 'draft')
      expect(store.currentNote?.tags).toEqual(['API'])
    })

    it('reorderNotes 应更新同级 sortOrder', () => {
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

    it('reorderNotes 置顶笔记应通过 updatedAt 保持拖拽顺序', () => {
      const store = useNoteStore()
      const folder = store.createFolder('工作')
      const a = store.createNoteWithContent('# A', folder.id)
      const b = store.createNoteWithContent('# B', folder.id)
      store.toggleNotePinned(a.id)
      store.toggleNotePinned(b.id)
      store.reorderNotes(folder.id, [b.id, a.id])
      const pinned = store.noteList
        .filter((n) => n.folderId === folder.id && n.pinned)
        .sort((x, y) => y.updatedAt - x.updatedAt)
      expect(pinned.map((n) => n.id)).toEqual([b.id, a.id])
    })

    it('setNoteTags 遇超长标签应拒绝并保留原标签', () => {
      const store = useNoteStore()
      const note = store.createNote()
      store.setNoteTags(note.id, ['ok'])
      expect(store.setNoteTags(note.id, ['ok', 'x'.repeat(21)])).toBe(false)
      expect(store.currentNote?.tags).toEqual(['ok'])
    })

    it('renameFolder 应更新名称', () => {
      const store = useNoteStore()
      const f = store.createFolder('旧名')
      store.renameFolder(f.id, '新名')
      expect(store.folderList[0].name).toBe('新名')
    })
  })

  // ===== 搜索 =====
  describe('searchQuery 过滤', () => {
    it('filteredNoteList 应返回所有笔记当 searchQuery 为空', () => {
      const store = useNoteStore()
      store.createNoteWithContent('# AAA')
      store.createNoteWithContent('# BBB')
      expect(store.filteredNoteList).toHaveLength(2)
    })

    it('filteredNoteList 应按标题过滤', () => {
      const store = useNoteStore()
      store.createNoteWithContent('# Alpha')
      store.createNoteWithContent('# Beta')
      store.searchQuery = 'beta'
      expect(store.filteredNoteList).toHaveLength(1)
      expect(store.filteredNoteList[0].title).toBe('Beta')
    })

    it('filteredNoteList 应按正文过滤', () => {
      const store = useNoteStore()
      store.createNoteWithContent('# 标题A\n唯一关键词xyz')
      store.createNoteWithContent('# 标题B\n普通内容')
      store.searchQuery = 'xyz'
      expect(store.filteredNoteList).toHaveLength(1)
      expect(store.filteredNoteList[0].title).toBe('标题A')
    })

    it('updateCurrentContent 后正文搜索应即时更新', () => {
      const store = useNoteStore()
      store.createNoteWithContent('# 笔记')
      store.searchQuery = '新插入的词'
      expect(store.filteredNoteList).toHaveLength(0)
      store.updateCurrentContent('# 笔记\n新插入的词')
      expect(store.filteredNoteList).toHaveLength(1)
    })

    it('filteredNoteList 应按文件夹过滤', () => {
      const store = useNoteStore()
      store.createNoteWithContent('# A', 'f1')
      store.createNoteWithContent('# B', 'f2')
      store.activeFolderId = 'f1'
      expect(store.filteredNoteList).toHaveLength(1)
      expect(store.filteredNoteList[0].title).toBe('A')
    })

    it('filteredNoteList 应按标签过滤', () => {
      const store = useNoteStore()
      const a = store.createNoteWithContent('# Alpha')
      store.createNoteWithContent('# Beta')
      store.setNoteTags(a.id, ['API'])
      store.searchQuery = 'api'
      expect(store.filteredNoteList).toHaveLength(1)
      expect(store.filteredNoteList[0].title).toBe('Alpha')
    })

    it('searchedNoteList 应叠加 activeTagFilter 与 searchQuery', () => {
      const store = useNoteStore()
      const a = store.createNoteWithContent('# Alpha\nshared body')
      const b = store.createNoteWithContent('# Beta\nshared body')
      store.setNoteTags(a.id, ['work'])
      store.setNoteTags(b.id, ['work'])
      store.activeTagFilter = 'work'
      store.searchQuery = 'alpha'
      expect(store.filteredNoteList).toHaveLength(1)
      expect(store.filteredNoteList[0].title).toBe('Alpha')
    })

    it('标签、搜索与文件夹三者应叠加过滤', () => {
      const store = useNoteStore()
      const match = store.createNoteWithContent('# Match', 'f1')
      const otherFolder = store.createNoteWithContent('# Match too', 'f2')
      store.setNoteTags(match.id, ['API'])
      store.setNoteTags(otherFolder.id, ['API'])
      store.activeTagFilter = 'API'
      store.searchQuery = 'match'
      store.activeFolderId = 'f1'
      expect(store.filteredNoteList).toHaveLength(1)
      expect(store.filteredNoteList[0].title).toBe('Match')
    })
  })

  // ===== TOC =====
  describe('TOC 控制', () => {
    it('setTocVisible 应更新 tocVisible', () => {
      const store = useNoteStore()
      store.setTocVisible(true)
      expect(store.tocVisible).toBe(true)
    })

    it('requestTocJump 应设置跳转目标', () => {
      const store = useNoteStore()
      store.requestTocJump(5, 2)
      expect(store.tocJumpTarget).toMatchObject({ line: 5, index: 2 })
    })
  })

  // ===== 大文件策略 =====
  describe('大文件策略', () => {
    it('clearPendingLargeFileSwitch 应清除标记', () => {
      const store = useNoteStore()
      store.pendingLargeFileSwitch = true
      store.clearPendingLargeFileSwitch()
      expect(store.pendingLargeFileSwitch).toBe(false)
    })
  })

  // ===== 文件夹导入 =====
  describe('batchImportFromFolder', () => {
    it('应批量导入并创建虚拟文件夹', async () => {
      const store = useNoteStore()
      const result = await store.batchImportFromFolder(
        {
          rootPath: '/tmp/lib',
          files: [
            { relativePath: 'readme.md', content: '# Readme', images: [] },
            { relativePath: 'docs/guide.md', content: '# Guide', images: [] },
          ],
        },
        {
          preserveStructure: true,
          onConflict: 'rename',
          importImages: false,
          replaceExisting: false,
          selectedPaths: null,
        }
      )

      expect(result.imported).toBe(2)
      expect(store.folderList.some((f) => f.name === 'docs')).toBe(true)
      expect(store.noteList).toHaveLength(2)
      expect(store.currentNote?.title).toBe('readme')
    })
  })
})

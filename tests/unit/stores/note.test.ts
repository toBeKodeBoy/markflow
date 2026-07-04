/**
 * Pinia Store 测试 — 验证笔记 CRUD、文件夹管理、搜索过滤、TOC 跳转
 * @file tests/unit/stores/note.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNoteStore } from '../../../src/stores/note'

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
      const n1 = store.createNoteWithContent('# A')
      const n2 = store.createNoteWithContent('# B')
      store.deleteNote(n1.id)
      expect(store.currentNote?.id).toBe(n2.id)
    })

    it('删除最后一个笔记后 currentNote 应为 null', () => {
      const store = useNoteStore()
      store.createNote()
      store.deleteNote(store.currentNote!.id)
      expect(store.currentNote).toBeNull()
      expect(store.liveContent).toBe('')
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

    it('移动到同一文件夹时不应更新', () => {
      const store = useNoteStore()
      const folder = store.createFolder('工作')
      store.createNoteWithContent('# A', folder.id)
      const id = store.currentNote!.id
      const updatedAt = store.currentNote!.updatedAt

      store.moveNote(id, folder.id)

      expect(store.currentNote!.folderId).toBe(folder.id)
      expect(store.currentNote!.updatedAt).toBe(updatedAt)
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
})

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNoteStore } from '../../src/stores/note'

describe('文件夹操作方法', () => {
  let store: ReturnType<typeof useNoteStore>

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    store = useNoteStore()
    store.loadNoteList()
  })

  afterEach(() => {
    store.clearTrash()
    store.clearTrashFolders()
    localStorage.clear()
  })

  describe('toggleFolderPinned', () => {
    it('切换 pinned 字段 true → false → true', () => {
      const folder = store.createFolder('测试文件夹')

      // 初始状态：pinned 未定义或 false
      expect(folder.pinned ?? false).toBe(false)

      // 第一次切换：true
      store.toggleFolderPinned(folder.id)
      const toggled1 = store.folderList.find(f => f.id === folder.id)
      expect(toggled1!.pinned).toBe(true)

      // 第二次切换：false
      store.toggleFolderPinned(folder.id)
      const toggled2 = store.folderList.find(f => f.id === folder.id)
      expect(toggled2!.pinned).toBe(false)

      // 第三次切换：true
      store.toggleFolderPinned(folder.id)
      const toggled3 = store.folderList.find(f => f.id === folder.id)
      expect(toggled3!.pinned).toBe(true)
    })

    it('不存在的文件夹应静默返回', () => {
      expect(() => store.toggleFolderPinned('non-existent-id')).not.toThrow()
    })

    it('子文件夹置顶应被拦截，pinned 保持 false', () => {
      const parent = store.createFolder('父文件夹')
      const child = store.createFolder('子文件夹', parent.id)

      store.toggleFolderPinned(child.id)
      const toggled = store.folderList.find(f => f.id === child.id)
      expect(toggled!.pinned ?? false).toBe(false)

      // 顶层文件夹置顶不受影响
      store.toggleFolderPinned(parent.id)
      const parentToggled = store.folderList.find(f => f.id === parent.id)
      expect(parentToggled!.pinned).toBe(true)
    })
  })

  describe('reorderFolders', () => {
    it('同级排序后 order 字段应正确', () => {
      const parent = store.createFolder('父文件夹')
      const child1 = store.createFolder('子文件夹1', parent.id)
      const child2 = store.createFolder('子文件夹2', parent.id)
      const child3 = store.createFolder('子文件夹3', parent.id)

      // 初始顺序：child1(0), child2(1), child3(2)
      const initialOrder = store.folderList
        .filter(f => f.parentId === parent.id)
        .sort((a, b) => a.order - b.order)
      expect(initialOrder.map(f => f.id)).toEqual([child1.id, child2.id, child3.id])

      // 反转顺序
      store.reorderFolders(parent.id, [child3.id, child2.id, child1.id])

      const reordered = store.folderList
        .filter(f => f.parentId === parent.id)
        .sort((a, b) => a.order - b.order)
      expect(reordered.map(f => f.id)).toEqual([child3.id, child2.id, child1.id])
      expect(reordered[0].order).toBe(0)
      expect(reordered[1].order).toBe(1)
      expect(reordered[2].order).toBe(2)
    })

    it('根级文件夹排序应正常工作', () => {
      const f1 = store.createFolder('根文件夹1')
      const f2 = store.createFolder('根文件夹2')
      const f3 = store.createFolder('根文件夹3')

      // 反转顺序
      store.reorderFolders(undefined, [f3.id, f2.id, f1.id])

      const reordered = store.folderList
        .filter(f => f.parentId === undefined)
        .sort((a, b) => a.order - b.order)
      expect(reordered.map(f => f.id)).toEqual([f3.id, f2.id, f1.id])
    })
  })

  describe('cloneNote', () => {
    it('应创建新 ID、标题含 _副本_、同 folderId、内容相同的笔记', () => {
      const folder = store.createFolder('测试文件夹')
      const original = store.createNote(folder.id)
      store.updateNoteContent(original.id, '# 原始内容\n\n这是测试正文')

      const cloned = store.cloneNote(original.id)

      expect(cloned).not.toBeNull()
      expect(cloned!.id).not.toBe(original.id)
      expect(cloned!.title).toContain('_副本_')
      expect(cloned!.folderId).toBe(original.folderId)
      expect(cloned!.content).toBe(original.content)
      // 克隆笔记应出现在主列表
      expect(store.noteList.some(n => n.id === cloned!.id)).toBe(true)
    })

    it('克隆笔记应深拷贝内容不共享引用', () => {
      const original = store.createNote()
      store.updateNoteContent(original.id, '# 原始\n\n内容')

      const cloned = store.cloneNote(original.id)

      expect(cloned).not.toBeNull()
      expect(cloned!.content).toBe(original.content)
      // 修改克隆不应影响原始
      store.updateNoteContent(cloned!.id, '# 修改后')
      const origNote = store.getNoteContentById(original.id)
      expect(origNote).toBe('# 原始\n\n内容')
    })

    it('不存在的笔记应返回 null', () => {
      const result = store.cloneNote('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('batchMoveNotes', () => {
    it('所有笔记 folderId 应更新为目标文件夹', () => {
      const sourceFolder = store.createFolder('源文件夹')
      const targetFolder = store.createFolder('目标文件夹')
      const note1 = store.createNote(sourceFolder.id)
      const note2 = store.createNote(sourceFolder.id)
      const note3 = store.createNote(sourceFolder.id)

      store.batchMoveNotes([note1.id, note2.id, note3.id], targetFolder.id)

      const updated1 = store.noteList.find(n => n.id === note1.id)
      const updated2 = store.noteList.find(n => n.id === note2.id)
      const updated3 = store.noteList.find(n => n.id === note3.id)
      expect(updated1!.folderId).toBe(targetFolder.id)
      expect(updated2!.folderId).toBe(targetFolder.id)
      expect(updated3!.folderId).toBe(targetFolder.id)
    })

    it('移动到根目录（folderId=undefined）应正常工作', () => {
      const folder = store.createFolder('文件夹')
      const note1 = store.createNote(folder.id)
      const note2 = store.createNote(folder.id)

      store.batchMoveNotes([note1.id, note2.id], undefined)

      const updated1 = store.noteList.find(n => n.id === note1.id)
      const updated2 = store.noteList.find(n => n.id === note2.id)
      expect(updated1!.folderId).toBeUndefined()
      expect(updated2!.folderId).toBeUndefined()
    })

    it('空 ID 列表应静默返回', () => {
      expect(() => store.batchMoveNotes([], undefined)).not.toThrow()
    })
  })

  describe('locateNoteFolder', () => {
    it('应返回正确的祖先 ID 链', () => {
      const folderA = store.createFolder('文件夹A')
      const folderB = store.createFolder('文件夹B', folderA.id)
      const folderC = store.createFolder('文件夹C', folderB.id)
      const note = store.createNote(folderC.id)

      const ancestors = store.locateNoteFolder(note.id)

      // folderC 的祖先是 [folderA, folderB]（从根到父）
      expect(ancestors).toEqual([folderA.id, folderB.id])
    })

    it('一级文件夹的笔记应返回空数组', () => {
      const folder = store.createFolder('根级文件夹')
      const note = store.createNote(folder.id)

      const ancestors = store.locateNoteFolder(note.id)

      // folder 的 parentId 为 undefined，无祖先
      expect(ancestors).toEqual([])
    })

    it('无 folderId 的笔记应返回空数组', () => {
      const note = store.createNote()

      const ancestors = store.locateNoteFolder(note.id)

      expect(ancestors).toEqual([])
    })

    it('不存在的笔记应返回空数组', () => {
      const ancestors = store.locateNoteFolder('non-existent-id')
      expect(ancestors).toEqual([])
    })
  })
})

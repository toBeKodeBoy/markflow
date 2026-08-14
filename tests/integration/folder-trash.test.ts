/**
 * 集成测试 — 文件夹管理系统端到端闭环
 * 覆盖：软删除/恢复/彻底删除、子树快照、恢复时父级缺失、
 * 置顶、同级排序、批量移动、克隆笔记、定位文件夹、回收站容量限制
 * @file tests/integration/folder-trash.test.ts
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNoteStore } from '../../src/stores/note'
import type { TrashFolderEntry } from '../../src/types'

describe('文件夹管理系统端到端集成', () => {
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

  describe('1. 软删除 → 恢复 → 彻底删除闭环', () => {
    it('文件夹 A 完整生命周期闭环', () => {
      // 创建文件夹 A
      const folderA = store.createFolder('文件夹A')
      expect(store.folderList.some(f => f.id === folderA.id)).toBe(true)

      // 软删除 A → folderList 无 A，回收站有 A
      store.softDeleteFolder(folderA.id)
      expect(store.folderList.some(f => f.id === folderA.id)).toBe(false)
      expect(store.getTrashFolders().some(e => e.folder.id === folderA.id)).toBe(true)

      // 恢复 A → folderList 有 A，回收站无 A
      const restored = store.restoreFolder(folderA.id)
      expect(restored).not.toBeNull()
      expect(store.folderList.some(f => f.id === folderA.id)).toBe(true)
      expect(store.getTrashFolders().some(e => e.folder.id === folderA.id)).toBe(false)

      // 再次软删除 A → 彻底删除 A → 回收站无 A
      store.softDeleteFolder(folderA.id)
      expect(store.getTrashFolders().some(e => e.folder.id === folderA.id)).toBe(true)
      store.permanentDeleteFolder(folderA.id)
      expect(store.getTrashFolders().some(e => e.folder.id === folderA.id)).toBe(false)
      expect(store.folderList.some(f => f.id === folderA.id)).toBe(false)
    })
  })

  describe('2. 子树笔记跟随文件夹删除/恢复', () => {
    it('软删除文件夹后子树笔记进入回收站，恢复后回到主列表且 folderId 不变', () => {
      const folderA = store.createFolder('文件夹A')
      const notes = [
        store.createNoteWithContent('# 笔记1\n\n内容1', folderA.id),
        store.createNoteWithContent('# 笔记2\n\n内容2', folderA.id),
        store.createNoteWithContent('# 笔记3\n\n内容3', folderA.id),
      ]

      // 软删除 A
      store.softDeleteFolder(folderA.id)

      // 3 篇笔记全部进入笔记回收站，且不在主列表
      const trashNotes = store.getTrashNotes()
      for (const note of notes) {
        expect(trashNotes.some(n => n.id === note.id)).toBe(true)
        expect(store.noteList.some(n => n.id === note.id)).toBe(false)
      }

      // 恢复 A
      store.restoreFolder(folderA.id)

      // 3 篇笔记回到主列表且 folderId 仍指向 A
      for (const note of notes) {
        const restoredNote = store.noteList.find(n => n.id === note.id)
        expect(restoredNote).toBeDefined()
        expect(restoredNote!.folderId).toBe(folderA.id)
      }
      // 笔记回收站中不再包含这些笔记
      const trashAfter = store.getTrashNotes()
      for (const note of notes) {
        expect(trashAfter.some(n => n.id === note.id)).toBe(false)
      }
    })
  })

  describe('3. 嵌套文件夹子树快照', () => {
    it('三层嵌套 A→B→C 删除后恢复，全部层级与笔记归属正确', () => {
      const folderA = store.createFolder('文件夹A')
      const folderB = store.createFolder('文件夹B', folderA.id)
      const folderC = store.createFolder('文件夹C', folderB.id)
      const note = store.createNoteWithContent('# 孙级笔记\n\n正文', folderC.id)

      // 软删除 A：整个子树进入回收站
      store.softDeleteFolder(folderA.id)
      expect(store.folderList.some(f => f.id === folderA.id)).toBe(false)
      expect(store.folderList.some(f => f.id === folderB.id)).toBe(false)
      expect(store.folderList.some(f => f.id === folderC.id)).toBe(false)
      expect(store.noteList.some(n => n.id === note.id)).toBe(false)

      // 快照完整性：entry 包含 B、C 与笔记 ID
      const entry = store.getTrashFolders().find(e => e.folder.id === folderA.id)
      expect(entry).toBeDefined()
      expect(entry!.descendantFolders.map(f => f.id)).toEqual(
        expect.arrayContaining([folderB.id, folderC.id])
      )
      expect(entry!.noteIds).toContain(note.id)

      // 恢复 A
      store.restoreFolder(folderA.id)

      // A/B/C 全部恢复，层级关系保持
      const restoredA = store.folderList.find(f => f.id === folderA.id)
      const restoredB = store.folderList.find(f => f.id === folderB.id)
      const restoredC = store.folderList.find(f => f.id === folderC.id)
      expect(restoredA).toBeDefined()
      expect(restoredB).toBeDefined()
      expect(restoredC).toBeDefined()
      expect(restoredA!.parentId).toBeUndefined()
      expect(restoredB!.parentId).toBe(folderA.id)
      expect(restoredC!.parentId).toBe(folderB.id)

      // 笔记恢复且 folderId 指向 C
      const restoredNote = store.noteList.find(n => n.id === note.id)
      expect(restoredNote).toBeDefined()
      expect(restoredNote!.folderId).toBe(folderC.id)
    })
  })

  describe('4. 恢复时原父级已删除', () => {
    it('先恢复父级再恢复子级：子级 parentId 指向父级', () => {
      const folderA = store.createFolder('文件夹A')
      const folderB = store.createFolder('文件夹B', folderA.id)

      // 先软删除 B，再软删除 A
      store.softDeleteFolder(folderB.id)
      store.softDeleteFolder(folderA.id)

      // 先恢复 A，再恢复 B → B 的 parentId 应指向 A
      store.restoreFolder(folderA.id)
      store.restoreFolder(folderB.id)

      const restoredB = store.folderList.find(f => f.id === folderB.id)
      expect(restoredB).toBeDefined()
      expect(restoredB!.parentId).toBe(folderA.id)
    })

    it('不恢复父级直接恢复子级：子级 parentId 应为 undefined（根目录）', () => {
      const folderA = store.createFolder('文件夹A')
      const folderB = store.createFolder('文件夹B', folderA.id)

      store.softDeleteFolder(folderB.id)
      store.softDeleteFolder(folderA.id)

      // 不恢复 A，直接恢复 B → B 应恢复到根目录
      store.restoreFolder(folderB.id)

      const restoredB = store.folderList.find(f => f.id === folderB.id)
      expect(restoredB).toBeDefined()
      expect(restoredB!.parentId).toBeUndefined()
      // A 仍在回收站中
      expect(store.getTrashFolders().some(e => e.folder.id === folderA.id)).toBe(true)
    })
  })

  describe('5. 置顶 → 取消置顶', () => {
    it('toggleFolderPinned 切换 pinned 状态', () => {
      const folder = store.createFolder('测试文件夹')
      expect(folder.pinned ?? false).toBe(false)

      // 置顶
      store.toggleFolderPinned(folder.id)
      const pinned = store.folderList.find(f => f.id === folder.id)
      expect(pinned!.pinned).toBe(true)

      // 取消置顶
      store.toggleFolderPinned(folder.id)
      const unpinned = store.folderList.find(f => f.id === folder.id)
      expect(unpinned!.pinned ?? false).toBe(false)
    })
  })

  describe('6. 同级排序', () => {
    it('拖拽重排后 order 字段正确', () => {
      const f1 = store.createFolder('文件夹1')
      const f2 = store.createFolder('文件夹2')
      const f3 = store.createFolder('文件夹3')

      // 初始顺序：f1(0), f2(1), f3(2)
      const initial = store.folderList
        .filter(f => f.parentId === undefined)
        .sort((a, b) => a.order - b.order)
      expect(initial.map(f => f.id)).toEqual([f1.id, f2.id, f3.id])

      // 模拟拖拽：将 f2 拖到最前
      store.reorderFolders(undefined, [f2.id, f1.id, f3.id])

      const reordered = store.folderList
        .filter(f => f.parentId === undefined)
        .sort((a, b) => a.order - b.order)
      expect(reordered.map(f => f.id)).toEqual([f2.id, f1.id, f3.id])
      expect(reordered[0].order).toBe(0)
      expect(reordered[1].order).toBe(1)
      expect(reordered[2].order).toBe(2)
    })
  })

  describe('7. 批量移动笔记', () => {
    it('batchMoveNotes 将 5 篇笔记从 A 移动到 B', () => {
      const folderA = store.createFolder('文件夹A')
      const folderB = store.createFolder('文件夹B')
      const notes = Array.from({ length: 5 }, (_, i) =>
        store.createNoteWithContent(`# 笔记${i + 1}\n\n正文`, folderA.id)
      )

      store.batchMoveNotes(notes.map(n => n.id), folderB.id)

      for (const note of notes) {
        const moved = store.noteList.find(n => n.id === note.id)
        expect(moved).toBeDefined()
        expect(moved!.folderId).toBe(folderB.id)
      }
      // A 中不再有笔记
      expect(store.noteList.filter(n => n.folderId === folderA.id)).toHaveLength(0)
    })
  })

  describe('8. 克隆笔记', () => {
    it('cloneNote 生成新 ID、标题含 _副本_、内容与归属相同', () => {
      const folder = store.createFolder('测试文件夹')
      const original = store.createNoteWithContent('# 原始笔记\n\n这是正文内容', folder.id)

      const cloned = store.cloneNote(original.id)

      expect(cloned).not.toBeNull()
      // 新 ID
      expect(cloned!.id).not.toBe(original.id)
      // 标题含 _副本_
      expect(cloned!.title).toContain('_副本_')
      // 内容相同
      expect(cloned!.content).toBe(original.content)
      // folderId 相同
      expect(cloned!.folderId).toBe(original.folderId)
      // 两篇笔记都在主列表
      expect(store.noteList.some(n => n.id === original.id)).toBe(true)
      expect(store.noteList.some(n => n.id === cloned!.id)).toBe(true)
    })
  })

  describe('9. 定位文件夹', () => {
    it('locateNoteFolder 返回祖先 ID 链（从根到父级，不含自身）', () => {
      const folderA = store.createFolder('文件夹A')
      const folderB = store.createFolder('文件夹B', folderA.id)
      const note = store.createNoteWithContent('# 笔记\n\n正文', folderB.id)

      // collectAncestorFolderIds 返回格式：从根到父级，不含笔记所属文件夹自身
      const ancestors = store.locateNoteFolder(note.id)
      expect(ancestors).toEqual([folderA.id])
    })
  })

  describe('10. 回收站容量限制', () => {
    it('文件夹回收站达到 200 条上限后软删除应被拒绝', () => {
      // 预填充文件夹回收站到上限（200 条）
      const mockEntries: TrashFolderEntry[] = Array.from({ length: 200 }, (_, i) => ({
        folder: { id: `trash-folder-${i}`, name: `folder-${i}`, order: 0 },
        descendantFolders: [],
        noteIds: [],
        deletedAt: Date.now(),
        deletedBy: 'user' as const,
      }))
      localStorage.setItem('markflow_trash_folders', JSON.stringify(mockEntries))

      // 创建新文件夹并尝试软删除
      const folder = store.createFolder('溢出文件夹')
      store.softDeleteFolder(folder.id)

      // 应被拒绝：文件夹仍在 folderList，且未进入回收站
      expect(store.folderList.some(f => f.id === folder.id)).toBe(true)
      expect(store.getTrashFolders().some(e => e.folder.id === folder.id)).toBe(false)
      expect(store.getTrashFolders().length).toBe(200)
    })
  })
})

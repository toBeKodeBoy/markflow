import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNoteStore } from '../../src/stores/note'
import type { TrashFolderEntry } from '../../src/types'

describe('文件夹回收站软删除功能', () => {
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

  describe('softDeleteFolder', () => {
    it('应该将文件夹及其子文件夹从 folderList 移除', () => {
      const parent = store.createFolder('父文件夹')
      const child = store.createFolder('子文件夹', parent.id)
      const grandchild = store.createFolder('孙文件夹', child.id)

      store.softDeleteFolder(parent.id)

      expect(store.folderList.some(f => f.id === parent.id)).toBe(false)
      expect(store.folderList.some(f => f.id === child.id)).toBe(false)
      expect(store.folderList.some(f => f.id === grandchild.id)).toBe(false)
    })

    it('TrashFolderEntry 应包含完整的子树快照', () => {
      const parent = store.createFolder('父文件夹')
      const child = store.createFolder('子文件夹', parent.id)
      const note = store.createNote(child.id)

      store.softDeleteFolder(parent.id)

      const entries = store.getTrashFolders()
      const entry = entries.find(e => e.folder.id === parent.id)
      expect(entry).toBeDefined()
      expect(entry!.folder.id).toBe(parent.id)
      expect(entry!.descendantFolders.length).toBe(1)
      expect(entry!.descendantFolders[0].id).toBe(child.id)
      expect(entry!.noteIds).toContain(note.id)
      expect(entry!.deletedAt).toBeGreaterThan(0)
      expect(entry!.deletedBy).toBe('user')
      expect(entry!.originalParentId).toBeUndefined()
    })

    it('子树内笔记也应被软删除（出现在笔记回收站）', () => {
      const parent = store.createFolder('父文件夹')
      const child = store.createFolder('子文件夹', parent.id)
      const note = store.createNote(child.id)

      store.softDeleteFolder(parent.id)

      // 笔记应出现在笔记回收站
      const trashNotes = store.getTrashNotes()
      expect(trashNotes.some(n => n.id === note.id)).toBe(true)
      // 笔记不应再出现在主列表
      expect(store.noteList.some(n => n.id === note.id)).toBe(false)
    })

    it('当回收站已满时应阻止删除并显示通知', () => {
      // 填充文件夹回收站到上限（200 条）
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

      // 应被阻止：文件夹仍在 folderList 中
      expect(store.folderList.some(f => f.id === folder.id)).toBe(true)
      // 不应出现在回收站
      const entries = store.getTrashFolders()
      expect(entries.some(e => e.folder.id === folder.id)).toBe(false)
      // 回收站条目仍为 200 条
      expect(entries.length).toBe(200)
    })
  })

  describe('restoreFolder', () => {
    it('原父级存在时应恢复到原父级下', () => {
      const parent = store.createFolder('父文件夹')
      const target = store.createFolder('目标文件夹', parent.id)

      store.softDeleteFolder(target.id)
      expect(store.folderList.some(f => f.id === target.id)).toBe(false)

      const restored = store.restoreFolder(target.id)

      expect(restored).toBeDefined()
      expect(restored!.id).toBe(target.id)
      expect(store.folderList.some(f => f.id === target.id)).toBe(true)
      // 验证 parentId 仍指向原父级
      const restoredFolder = store.folderList.find(f => f.id === target.id)
      expect(restoredFolder!.parentId).toBe(parent.id)
    })

    it('原父级不存在时应恢复到根目录', () => {
      const parent = store.createFolder('父文件夹')
      const target = store.createFolder('目标文件夹', parent.id)

      store.softDeleteFolder(target.id)

      // 模拟原父级被删除（从 folderList 中移除）
      store.folderList = store.folderList.filter(f => f.id !== parent.id)

      const restored = store.restoreFolder(target.id)

      expect(restored).toBeDefined()
      const restoredFolder = store.folderList.find(f => f.id === target.id)
      expect(restoredFolder).toBeDefined()
      expect(restoredFolder!.parentId).toBeUndefined()
    })

    it('恢复后文件夹应回到 folderList', () => {
      const parent = store.createFolder('父文件夹')
      const child = store.createFolder('子文件夹', parent.id)

      store.softDeleteFolder(parent.id)
      expect(store.folderList.some(f => f.id === parent.id)).toBe(false)
      expect(store.folderList.some(f => f.id === child.id)).toBe(false)

      store.restoreFolder(parent.id)

      expect(store.folderList.some(f => f.id === parent.id)).toBe(true)
      expect(store.folderList.some(f => f.id === child.id)).toBe(true)
    })

    it('恢复后关联笔记也应回到主列表', () => {
      const parent = store.createFolder('父文件夹')
      const child = store.createFolder('子文件夹', parent.id)
      const note = store.createNote(child.id)
      store.updateNoteContent(note.id, '# 测试内容')

      store.softDeleteFolder(parent.id)
      expect(store.noteList.some(n => n.id === note.id)).toBe(false)

      store.restoreFolder(parent.id)

      expect(store.noteList.some(n => n.id === note.id)).toBe(true)
    })

    it('恢复不存在的文件夹应返回 null', () => {
      const result = store.restoreFolder('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('permanentDeleteFolder', () => {
    it('应该从回收站彻底清除文件夹条目', () => {
      const folder = store.createFolder('测试文件夹')
      store.softDeleteFolder(folder.id)

      expect(store.getTrashFolders().some(e => e.folder.id === folder.id)).toBe(true)

      store.permanentDeleteFolder(folder.id)

      expect(store.getTrashFolders().some(e => e.folder.id === folder.id)).toBe(false)
    })

    it('永久删除后关联笔记也应被清除', () => {
      const parent = store.createFolder('父文件夹')
      const child = store.createFolder('子文件夹', parent.id)
      const note = store.createNote(child.id)

      store.softDeleteFolder(parent.id)

      // 笔记在回收站中
      expect(store.getTrashNotes().some(n => n.id === note.id)).toBe(true)

      store.permanentDeleteFolder(parent.id)

      // 文件夹回收站中已移除
      expect(store.getTrashFolders().some(e => e.folder.id === parent.id)).toBe(false)
      // 笔记回收站中也已移除
      expect(store.getTrashNotes().some(n => n.id === note.id)).toBe(false)
    })
  })

  describe('clearTrashFolders', () => {
    it('应该清空所有文件夹回收站条目', () => {
      const folder1 = store.createFolder('文件夹1')
      const folder2 = store.createFolder('文件夹2')
      store.softDeleteFolder(folder1.id)
      store.softDeleteFolder(folder2.id)

      expect(store.getTrashFolders().length).toBe(2)

      store.clearTrashFolders()

      expect(store.getTrashFolders().length).toBe(0)
    })
  })

  describe('getTrashFolders', () => {
    it('应该按删除时间倒序返回条目', () => {
      vi.useFakeTimers()

      const folder1 = store.createFolder('文件夹1')
      vi.setSystemTime(1000)
      store.softDeleteFolder(folder1.id)

      const folder2 = store.createFolder('文件夹2')
      vi.setSystemTime(2000)
      store.softDeleteFolder(folder2.id)

      vi.useRealTimers()

      const entries = store.getTrashFolders()
      expect(entries.length).toBeGreaterThanOrEqual(2)
      // folder2 后删除，应排在前面
      expect(entries[0].folder.id).toBe(folder2.id)
      expect(entries[1].folder.id).toBe(folder1.id)
    })
  })

  describe('purgeOldTrashFolders', () => {
    it('应该清理超过指定天数的过期条目', async () => {
      const oldFolder = store.createFolder('旧文件夹')
      const recentFolder = store.createFolder('新文件夹')

      // 保存真实时间后再启用假时钟，避免 Date.now() 返回冻结时间
      const realNow = Date.now()
      vi.useFakeTimers()

      // 31 天前删除旧文件夹
      vi.setSystemTime(realNow - 31 * 24 * 60 * 60 * 1000)
      store.softDeleteFolder(oldFolder.id)

      // 当前时间删除新文件夹
      vi.setSystemTime(realNow)
      store.softDeleteFolder(recentFolder.id)

      vi.useRealTimers()

      await store.purgeOldTrashFolders(30)

      const entries = store.getTrashFolders()
      // 旧条目应被清理
      expect(entries.some(e => e.folder.id === oldFolder.id)).toBe(false)
      // 新条目应保留
      expect(entries.some(e => e.folder.id === recentFolder.id)).toBe(true)
    })

    it('无过期条目时不应执行任何删除', async () => {
      const folder = store.createFolder('测试文件夹')
      store.softDeleteFolder(folder.id)

      await store.purgeOldTrashFolders(30)

      expect(store.getTrashFolders().some(e => e.folder.id === folder.id)).toBe(true)
    })
  })

  describe('deleteFolder 重定向到 softDeleteFolder', () => {
    it('调用 deleteFolder 应触发软删除而非硬删除', () => {
      const parent = store.createFolder('父文件夹')
      const child = store.createFolder('子文件夹', parent.id)
      const note = store.createNote(child.id)

      store.deleteFolder(parent.id)

      // 文件夹从 folderList 移除
      expect(store.folderList.some(f => f.id === parent.id)).toBe(false)
      expect(store.folderList.some(f => f.id === child.id)).toBe(false)
      // 出现在文件夹回收站
      expect(store.getTrashFolders().some(e => e.folder.id === parent.id)).toBe(true)
      // 笔记也出现在笔记回收站（而非移入父文件夹——这是软删除行为）
      expect(store.getTrashNotes().some(n => n.id === note.id)).toBe(true)
    })
  })
})

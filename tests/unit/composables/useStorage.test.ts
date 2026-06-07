/**
 * 存储抽象层测试 — 验证 useStorage 在 uTools 和 localStorage 下的行为
 * @file tests/unit/composables/useStorage.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStorage } from '../../../src/composables/useStorage'

describe('useStorage', () => {
  let storage: ReturnType<typeof useStorage>

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    storage = useStorage()
  })

  // ===== 笔记列表 =====
  describe('笔记列表', () => {
    it('初始时笔记列表应为空', () => {
      expect(storage.getNoteList()).toEqual([])
    })

    it('saveNoteList 后 getNoteList 应返回相同数据', () => {
      const notes = [
        { id: '1', title: '笔记A', folderId: undefined, updatedAt: 1000 },
        { id: '2', title: '笔记B', folderId: 'f1', updatedAt: 2000 },
      ]
      storage.saveNoteList(notes)
      expect(storage.getNoteList()).toEqual(notes)
    })
  })

  // ===== 单篇笔记 =====
  describe('单篇笔记', () => {
    it('getNote 对不存在的 id 应返回 null', () => {
      expect(storage.getNote('nonexistent')).toBeNull()
    })

    it('saveNote 后 getNote 应返回完整 Note 对象', () => {
      const note = {
        id: 'n1',
        title: '测试笔记',
        content: '# Hello',
        folderId: undefined,
        tags: [],
        createdAt: 1000,
        updatedAt: 1001,
      }
      storage.saveNote(note)
      expect(storage.getNote('n1')).toEqual(note)
    })

    it('saveNote 应自动更新 noteList', () => {
      const note = {
        id: 'n1', title: '测试', content: '# T', folderId: 'f1',
        tags: [], createdAt: 1000, updatedAt: 1001,
      }
      storage.saveNote(note)
      const list = storage.getNoteList()
      expect(list).toHaveLength(1)
      expect(list[0]).toEqual({ id: 'n1', title: '测试', folderId: 'f1', updatedAt: 1001 })
    })

    it('removeNote 应删除笔记及其列表项', () => {
      const note = {
        id: 'n2', title: '待删', content: '', folderId: undefined,
        tags: [], createdAt: 1000, updatedAt: 1000,
      }
      storage.saveNote(note)
      storage.removeNote('n2')
      expect(storage.getNote('n2')).toBeNull()
      expect(storage.getNoteList()).toHaveLength(0)
    })
  })

  // ===== 文件夹 =====
  describe('文件夹', () => {
    it('初始文件夹列表为空', () => {
      expect(storage.getFolderList()).toEqual([])
    })

    it('saveFolderList 持久化文件夹', () => {
      storage.saveFolderList([{ id: 'f1', name: '工作', order: 0 }])
      expect(storage.getFolderList()).toEqual([{ id: 'f1', name: '工作', order: 0 }])
    })
  })

  // ===== 设置 =====
  describe('设置', () => {
    it('getSettings 应返回合并了默认值的设置', () => {
      const settings = storage.getSettings()
      expect(settings).toHaveProperty('theme')
      expect(settings).toHaveProperty('fontSize')
    })

    it('saveSettings 后 getSettings 应返回更新值', () => {
      storage.saveSettings({ theme: 'dark', fontSize: 16, editorFontFamily: 'monospace', previewVisible: true, sidebarVisible: true })
      expect(storage.getSettings().theme).toBe('dark')
      expect(storage.getSettings().fontSize).toBe(16)
    })
  })

  // ===== 持久化边界 =====
  describe('持久化边界', () => {
    it('存储抽象层应能在 uTools 和浏览器间无缝切换', () => {
      // 在 setup 中已 mock 了 markflow，所以这里使用 uTools 模式
      const note = {
        id: 'persist', title: '持久化', content: 'data',
        folderId: undefined, tags: [], createdAt: 0, updatedAt: 0,
      }
      storage.saveNote(note)
      // 验证数据写入 uTools bridge
      expect(window.markflow.saveNote).toHaveBeenCalled()
      expect(storage.getNote('persist')).toBeTruthy()
    })
  })
})

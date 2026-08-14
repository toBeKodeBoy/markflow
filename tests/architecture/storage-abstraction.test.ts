import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { TrashFolderEntry } from '../../src/types'

/** 构造测试用 TrashFolderEntry */
function makeEntry(id: string): TrashFolderEntry {
  return {
    folder: { id, name: `Folder ${id}`, order: 0 },
    descendantFolders: [],
    noteIds: [],
    deletedAt: 1000,
    deletedBy: 'user',
  }
}

describe('preload bridge contract', () => {
  it('exposes complete uTools storage API', () => {
    const api = window.markflow
    expect(typeof api.getNoteList).toBe('function')
    expect(typeof api.saveNoteList).toBe('function')
    expect(typeof api.getNote).toBe('function')
    expect(typeof api.saveNote).toBe('function')
    expect(typeof api.removeNote).toBe('function')
    expect(typeof api.getFolderList).toBe('function')
    expect(typeof api.saveFolderList).toBe('function')
    expect(typeof api.getSettings).toBe('function')
    expect(typeof api.saveSettings).toBe('function')
  })

  it('MarkFlowBridge 接口包含 getTrashFolders 方法', () => {
    const api = window.markflow
    expect(typeof api.getTrashFolders).toBe('function')
  })

  it('MarkFlowBridge 接口包含 saveTrashFolders 方法', () => {
    const api = window.markflow
    expect(typeof api.saveTrashFolders).toBe('function')
  })
})

describe('useStorage architecture', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('uses window.markflow in uTools environment', async () => {
    const { useStorage } = await import('../../src/composables/useStorage')
    const storage = useStorage()
    storage.saveNoteList([{ id: 'a', title: 'A', updatedAt: 0 }])
    expect(window.markflow.saveNoteList).toHaveBeenCalled()
  })

  it('falls back to localStorage outside uTools', async () => {
    const realMarkflow = window.markflow
    delete (window as { markflow?: typeof window.markflow }).markflow

    localStorage.clear()
    const { useStorage } = await import('../../src/composables/useStorage')
    const storage = useStorage()

    storage.saveNote({
      id: 'f1',
      title: 'Fallback',
      content: '# Fallback',
      folderId: undefined,
      createdAt: 0,
      updatedAt: 0,
    })

    const raw = localStorage.getItem('markflow_note_f1')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!).title).toBe('Fallback')

    window.markflow = realMarkflow
  })
})

describe('文件夹回收站 localStorage fallback', () => {
  let realMarkflow: typeof window.markflow

  beforeEach(() => {
    localStorage.clear()
    realMarkflow = window.markflow
    delete (window as { markflow?: typeof window.markflow }).markflow
  })

  afterEach(() => {
    window.markflow = realMarkflow
  })

  it('getTrashFolders() 初始状态返回空数组', async () => {
    const { useStorage } = await import('../../src/composables/useStorage')
    const storage = useStorage()
    expect(storage.getTrashFolders()).toEqual([])
  })

  it('saveTrashFolders(list) 后 getTrashFolders() 返回该列表', async () => {
    const { useStorage } = await import('../../src/composables/useStorage')
    const storage = useStorage()
    const entries = [makeEntry('f1'), makeEntry('f2')]
    storage.saveTrashFolders(entries)
    expect(storage.getTrashFolders()).toEqual(entries)
  })

  it('读写 markflow_trash_folders localStorage 键', async () => {
    const { useStorage } = await import('../../src/composables/useStorage')
    const storage = useStorage()
    storage.saveTrashFolders([makeEntry('f1')])
    const raw = localStorage.getItem('markflow_trash_folders')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!)).toHaveLength(1)
  })
})

describe('文件夹回收站方法逻辑（fallback 路径）', () => {
  let realMarkflow: typeof window.markflow

  beforeEach(() => {
    localStorage.clear()
    realMarkflow = window.markflow
    delete (window as { markflow?: typeof window.markflow }).markflow
  })

  afterEach(() => {
    window.markflow = realMarkflow
  })

  it('saveTrashFolderEntry: 同 ID 的 entry 被覆盖', async () => {
    const { useStorage } = await import('../../src/composables/useStorage')
    const storage = useStorage()
    const entry = makeEntry('f1')
    storage.saveTrashFolderEntry(entry)
    const updated = makeEntry('f1')
    updated.folder.name = 'Updated'
    storage.saveTrashFolderEntry(updated)
    const list = storage.getTrashFolders()
    expect(list).toHaveLength(1)
    expect(list[0].folder.name).toBe('Updated')
  })

  it('saveTrashFolderEntry: 新 ID 的 entry 被 push 到末尾', async () => {
    const { useStorage } = await import('../../src/composables/useStorage')
    const storage = useStorage()
    storage.saveTrashFolderEntry(makeEntry('f1'))
    storage.saveTrashFolderEntry(makeEntry('f2'))
    const list = storage.getTrashFolders()
    expect(list).toHaveLength(2)
    expect(list[0].folder.id).toBe('f1')
    expect(list[1].folder.id).toBe('f2')
  })

  it('removeTrashFolder: 移除指定 ID 的 entry', async () => {
    const { useStorage } = await import('../../src/composables/useStorage')
    const storage = useStorage()
    storage.saveTrashFolderEntry(makeEntry('f1'))
    storage.saveTrashFolderEntry(makeEntry('f2'))
    storage.removeTrashFolder('f1')
    const list = storage.getTrashFolders()
    expect(list).toHaveLength(1)
    expect(list[0].folder.id).toBe('f2')
  })

  it('removeTrashFolder: 不存在的 ID 不影响列表', async () => {
    const { useStorage } = await import('../../src/composables/useStorage')
    const storage = useStorage()
    storage.saveTrashFolderEntry(makeEntry('f1'))
    storage.removeTrashFolder('nonexistent')
    expect(storage.getTrashFolders()).toHaveLength(1)
  })

  it('restoreTrashFolder: 返回被恢复的 entry 并从列表移除', async () => {
    const { useStorage } = await import('../../src/composables/useStorage')
    const storage = useStorage()
    const entry = makeEntry('f1')
    storage.saveTrashFolderEntry(entry)
    const restored = storage.restoreTrashFolder('f1')
    expect(restored).toEqual(entry)
    expect(storage.getTrashFolders()).toHaveLength(0)
  })

  it('restoreTrashFolder: 不存在的 ID 返回 null', async () => {
    const { useStorage } = await import('../../src/composables/useStorage')
    const storage = useStorage()
    const restored = storage.restoreTrashFolder('nonexistent')
    expect(restored).toBeNull()
  })

  it('permanentlyDeleteFolder: 从回收站移除指定 entry', async () => {
    const { useStorage } = await import('../../src/composables/useStorage')
    const storage = useStorage()
    storage.saveTrashFolderEntry(makeEntry('f1'))
    storage.saveTrashFolderEntry(makeEntry('f2'))
    storage.permanentlyDeleteFolder('f1')
    const list = storage.getTrashFolders()
    expect(list).toHaveLength(1)
    expect(list[0].folder.id).toBe('f2')
  })

  it('clearTrashFolders: 清空后列表为空', async () => {
    const { useStorage } = await import('../../src/composables/useStorage')
    const storage = useStorage()
    storage.saveTrashFolderEntry(makeEntry('f1'))
    storage.saveTrashFolderEntry(makeEntry('f2'))
    storage.clearTrashFolders()
    expect(storage.getTrashFolders()).toEqual([])
  })
})

describe('Pinia store architecture', () => {
  it('core note operations are exposed through the store', async () => {
    const { setActivePinia, createPinia } = await import('pinia')
    setActivePinia(createPinia())
    const { useNoteStore } = await import('../../src/stores/note')
    const store = useNoteStore()

    expect(typeof store.createNote).toBe('function')
    expect(typeof store.openNote).toBe('function')
    expect(typeof store.updateCurrentContent).toBe('function')
    expect(typeof store.deleteNote).toBe('function')
    expect(typeof store.renameNote).toBe('function')
    expect(typeof store.createFolder).toBe('function')
    expect(typeof store.deleteFolder).toBe('function')
    expect(typeof store.renameFolder).toBe('function')
    expect(typeof store.batchImportFromFolder).toBe('function')
    expect(Array.isArray(store.filteredNoteList)).toBe(true)
  })
})

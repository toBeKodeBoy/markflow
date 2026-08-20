import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStorage } from '../../../src/composables/useStorage'
import type { NoteListItem } from '../../../src/types'

describe('useStorage', () => {
  let storage: ReturnType<typeof useStorage>

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    storage = useStorage()
  })

  it('initial note list is empty', () => {
    expect(storage.getNoteList()).toEqual([])
  })

  it('saveNoteList and getNoteList round-trip', () => {
    const notes = [
      { id: '1', title: 'A', folderId: undefined, updatedAt: 1000 },
      { id: '2', title: 'B', folderId: 'f1', updatedAt: 2000 },
    ]
    storage.saveNoteList(notes)
    expect(storage.getNoteList()).toEqual(notes)
  })

  it('saveNote and getNote round-trip', () => {
    const note = {
      id: 'n1',
      title: 'Test',
      content: '# Hello',
      folderId: undefined,
      createdAt: 1000,
      updatedAt: 1001,
    }
    storage.saveNote(note)
    expect(storage.getNote('n1')).toEqual(note)
  })

  it('saveNote updates noteList entry', () => {
    const note = {
      id: 'n1',
      title: 'Test',
      content: '# T',
      folderId: 'f1',
      createdAt: 1000,
      updatedAt: 1001,
    }
    storage.saveNote(note)
    expect(storage.getNoteList()).toEqual([
      { id: 'n1', title: 'Test', folderId: 'f1', updatedAt: 1001 },
    ])
  })

  it('strips legacy tags from getNote', () => {
    localStorage.setItem('markflow_note_legacy', JSON.stringify({
      id: 'legacy',
      title: 'Legacy',
      content: '# Legacy',
      tags: ['work'],
      createdAt: 1,
      updatedAt: 2,
    }))

    expect(storage.getNote('legacy')).toEqual({
      id: 'legacy',
      title: 'Legacy',
      content: '# Legacy',
      createdAt: 1,
      updatedAt: 2,
    })
  })

  it('strips legacy tags from getNoteList', () => {
    localStorage.setItem('markflow_note_list', JSON.stringify([
      { id: 'legacy', title: 'Legacy', updatedAt: 2, tags: ['work'] },
    ]))

    expect(storage.getNoteList()).toEqual([
      { id: 'legacy', title: 'Legacy', updatedAt: 2 },
    ])
  })

  it('saveNoteList strips legacy tags before persist', () => {
    storage.saveNoteList([
      { id: 'legacy', title: 'Legacy', updatedAt: 2, tags: ['work'] } as NoteListItem & { tags: string[] },
    ])

    const raw = JSON.parse(localStorage.getItem('markflow_note_list') || '[]')
    expect(raw).toEqual([{ id: 'legacy', title: 'Legacy', updatedAt: 2 }])
    expect(raw[0]).not.toHaveProperty('tags')
    expect(storage.getNoteList()).toEqual([{ id: 'legacy', title: 'Legacy', updatedAt: 2 }])
  })

  it('removeNote deletes note and list item', () => {
    const note = {
      id: 'n2',
      title: 'Delete me',
      content: '',
      folderId: undefined,
      createdAt: 1000,
      updatedAt: 1000,
    }
    storage.saveNote(note)
    storage.removeNote('n2')
    expect(storage.getNote('n2')).toBeNull()
    expect(storage.getNoteList()).toEqual([])
  })

  it('saveFolderList persists folders', () => {
    storage.saveFolderList([{ id: 'f1', name: 'Work', order: 0 }])
    expect(storage.getFolderList()).toEqual([{ id: 'f1', name: 'Work', order: 0 }])
  })

  it('saveSettings persists settings', () => {
    storage.saveSettings({
      theme: 'dark',
      fontSize: 16,
      editorFontFamily: 'monospace',
      previewVisible: true,
      sidebarVisible: true,
    })
    expect(storage.getSettings().theme).toBe('dark')
    expect(storage.getSettings().fontSize).toBe(16)
  })

  it('缺省设置首次打开应关闭侧栏', () => {
    expect(storage.getSettings().sidebarVisible).toBe(false)
  })

  it('uTools mode uses bridge save', () => {
    const note = {
      id: 'persist',
      title: 'Persist',
      content: 'data',
      folderId: undefined,
      createdAt: 0,
      updatedAt: 0,
    }
    storage.saveNote(note)
    expect(window.markflow.saveNote).toHaveBeenCalled()
    expect(storage.getNote('persist')).toBeTruthy()
  })

  it('saveNoteBatch writes notes once and upserts list once', () => {
    const saveNoteListSpy = vi.spyOn(window.markflow, 'saveNoteList')
    const notes = [
      {
        id: 'b1',
        title: 'Batch 1',
        content: '# 1',
        folderId: 'f1',
        createdAt: 1,
        updatedAt: 1,
        sortOrder: 100,
      },
      {
        id: 'b2',
        title: 'Batch 2',
        content: '# 2',
        folderId: 'f1',
        createdAt: 2,
        updatedAt: 2,
        sortOrder: 200,
        pinned: true,
      },
    ]

    storage.saveNoteBatch(notes)

    expect(storage.getNote('b1')?.title).toBe('Batch 1')
    expect(storage.getNote('b2')?.pinned).toBe(true)
    expect(storage.getNoteList()).toEqual([
      { id: 'b2', title: 'Batch 2', folderId: 'f1', updatedAt: 2, pinned: true, sortOrder: 200 },
      { id: 'b1', title: 'Batch 1', folderId: 'f1', updatedAt: 1, sortOrder: 100 },
    ])
    // 批量只写回列表一次（相对逐条 saveNote 的 N 次）
    expect(saveNoteListSpy).toHaveBeenCalledTimes(1)
  })

  it('saveNoteBatch updates existing list items and strips legacy tags', () => {
    storage.saveNote({
      id: 'b1',
      title: 'Old',
      content: 'old',
      createdAt: 1,
      updatedAt: 1,
    })
    vi.mocked(window.markflow.saveNoteList).mockClear()

    storage.saveNoteBatch([
      {
        id: 'b1',
        title: 'New',
        content: 'new',
        folderId: 'f2',
        createdAt: 1,
        updatedAt: 9,
        sortOrder: 50,
      } as never,
    ])

    expect(storage.getNoteList()).toEqual([
      { id: 'b1', title: 'New', folderId: 'f2', updatedAt: 9, sortOrder: 50 },
    ])
    expect(storage.getNote('b1')?.content).toBe('new')
    expect(vi.mocked(window.markflow.saveNoteList)).toHaveBeenCalledTimes(1)
  })

  it('saveNoteBatch no-ops on empty array without touching list', () => {
    const saveNoteListSpy = vi.spyOn(window.markflow, 'saveNoteList')
    storage.saveNoteBatch([])
    expect(saveNoteListSpy).not.toHaveBeenCalled()
  })
})

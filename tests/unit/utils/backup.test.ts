import { describe, it, expect } from 'vitest'
import {
  buildBackup,
  parseBackup,
  applyBackup,
  BACKUP_VERSION,
  BACKUP_VERSION_LEGACY,
} from '../../../src/utils/backup'
import type { Note, Folder, AppSettings } from '../../../src/types'
import type { AssetIndexItem, AssetRecord } from '../../../src/types/asset'

describe('backup', () => {
  it('builds and restores backup payload', () => {
    const note: Note = {
      id: 'n1',
      title: 'Hello',
      content: '# Hello',
      createdAt: 1,
      updatedAt: 2,
    }
    const folders: Folder[] = [{ id: 'f1', name: 'docs', order: 0 }]
    const settings: AppSettings = {
      theme: 'light',
      fontSize: 14,
      editorFontFamily: 'monospace',
      previewVisible: true,
      sidebarVisible: true,
      sidebarExpandedFolderIds: ['f1'],
      sidebarActiveFolderId: 'f1',
    }

    const savedNotes: Note[] = []
    let savedFolders: Folder[] = []
    let savedSettings: AppSettings = settings

    const storage = {
      getNoteList: () => [{ id: 'n1', title: 'Hello', updatedAt: 2, folderId: 'f1' }],
      getNote: (id: string) => (id === 'n1' ? note : null),
      getFolderList: () => folders,
      getSettings: () => settings,
      saveNote: (n: Note) => {
        savedNotes.push(n)
      },
      saveFolderList: (list: Folder[]) => {
        savedFolders = list
      },
      saveSettings: (s: AppSettings) => {
        savedSettings = s
      },
      clearAllNotesAndFolders: () => {
        savedNotes.length = 0
        savedFolders = []
      },
    }

    const backup = buildBackup(storage)
    const parsed = parseBackup(JSON.stringify(backup))
    applyBackup(parsed, storage)

    expect(backup.version).toBe(BACKUP_VERSION)
    expect(savedFolders).toEqual(folders)
    expect(savedNotes).toHaveLength(1)
    expect(savedSettings.sidebarExpandedFolderIds).toEqual(['f1'])
  })

  it('strips legacy tags from exported notes', () => {
    const storage = {
      getNoteList: () => [{ id: 'n1', title: 'Hello', updatedAt: 2 }],
      getNote: () => ({
        id: 'n1',
        title: 'Hello',
        content: '# Hello',
        tags: ['work'],
        createdAt: 1,
        updatedAt: 2,
      }),
      getFolderList: () => [] as Folder[],
      getSettings: () =>
        ({
          theme: 'light',
          fontSize: 14,
          editorFontFamily: 'monospace',
          previewVisible: true,
          sidebarVisible: true,
        }) satisfies AppSettings,
    }

    const backup = buildBackup(storage)
    expect(backup.notes[0]).not.toHaveProperty('tags')
  })

  it('builds v2 backup with assets and parses legacy v1 while stripping tags', () => {
    const noteWithTags = {
      id: 'n1',
      title: 'Hello',
      content: '![img](markflow-asset://a1)',
      tags: ['work'],
      createdAt: 1,
      updatedAt: 2,
    }
    const assetIndex: AssetIndexItem[] = [
      { id: 'a1', mimeType: 'image/png', size: 4, createdAt: 1 },
    ]
    const assetRecord: AssetRecord = {
      meta: { id: 'a1', mimeType: 'image/png', size: 4, createdAt: 1 },
      data: 'abcd',
    }

    const storage = {
      getNoteList: () => [{ id: 'n1', title: 'Hello', updatedAt: 2 }],
      getNote: (id: string) => (id === 'n1' ? ({ ...noteWithTags, tags: undefined } as Note) : null),
      getFolderList: () => [] as Folder[],
      getSettings: () =>
        ({
          theme: 'light',
          fontSize: 14,
          editorFontFamily: 'monospace',
          previewVisible: true,
          sidebarVisible: true,
        }) satisfies AppSettings,
    }

    const backup = buildBackup(storage, {
      getIndex: () => assetIndex,
      getAsset: (id) => (id === 'a1' ? assetRecord : null),
    })

    expect(backup.assets.index).toHaveLength(1)
    expect(backup.assets.records.a1.data).toBe('abcd')

    const legacyJson = JSON.stringify({
      version: BACKUP_VERSION_LEGACY,
      exportedAt: 1,
      notes: [noteWithTags],
      folders: [],
      settings: storage.getSettings(),
    })
    const legacy = parseBackup(legacyJson)
    expect(legacy.assets.index).toEqual([])
    expect(legacy.assets.records).toEqual({})
    expect(legacy.notes[0]).not.toHaveProperty('tags')
  })

  it('applyBackup strips legacy tags before save', () => {
    const savedNotes: Note[] = []
    const storage = {
      getNoteList: () => [],
      getNote: () => null,
      getFolderList: () => [] as Folder[],
      getSettings: () =>
        ({
          theme: 'light',
          fontSize: 14,
          editorFontFamily: 'monospace',
          previewVisible: true,
          sidebarVisible: true,
        }) satisfies AppSettings,
      saveNote: (note: Note) => {
        savedNotes.push(note)
      },
      saveFolderList: () => {},
      saveSettings: () => {},
      clearAllNotesAndFolders: () => {},
    }

    applyBackup({
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      notes: [{
        id: 'n1',
        title: 'Hello',
        content: '# Hello',
        tags: ['work'],
        createdAt: 1,
        updatedAt: 2,
      } as Note & { tags: string[] }],
      folders: [],
      settings: storage.getSettings(),
      assets: { index: [], records: {} },
    }, storage)

    expect(savedNotes[0]).not.toHaveProperty('tags')
  })

  it('applyBackup restores assets', () => {
    const note: Note = {
      id: 'n1',
      title: 'Hello',
      content: '# Hello',
      createdAt: 1,
      updatedAt: 2,
    }
    const savedAssets: AssetRecord[] = []
    let savedIndex: AssetIndexItem[] = []

    const storage = {
      getNoteList: () => [],
      getNote: () => null,
      getFolderList: () => [] as Folder[],
      getSettings: () =>
        ({
          theme: 'light',
          fontSize: 14,
          editorFontFamily: 'monospace',
          previewVisible: true,
          sidebarVisible: true,
        }) satisfies AppSettings,
      saveNote: () => {},
      saveFolderList: () => {},
      saveSettings: () => {},
      clearAllNotesAndFolders: () => {},
    }

    const backup = {
      version: BACKUP_VERSION as typeof BACKUP_VERSION,
      exportedAt: Date.now(),
      notes: [note],
      folders: [] as Folder[],
      settings: storage.getSettings(),
      assets: {
        index: [{ id: 'a1', mimeType: 'image/png', size: 4, createdAt: 1 }],
        records: {
          a1: {
            meta: { id: 'a1', mimeType: 'image/png', size: 4, createdAt: 1 },
            data: 'abcd',
          },
        },
      },
    }

    applyBackup(backup, storage, {
      saveAssetIndex: (index) => {
        savedIndex = index
      },
      saveAsset: (_id, record) => {
        savedAssets.push(record)
      },
    })

    expect(savedIndex).toHaveLength(1)
    expect(savedAssets).toHaveLength(1)
    expect(savedAssets[0].data).toBe('abcd')
  })
})

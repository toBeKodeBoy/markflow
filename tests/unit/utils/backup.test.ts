import { describe, it, expect } from 'vitest'
import { buildBackup, parseBackup, applyBackup, BACKUP_VERSION } from '../../../src/utils/backup'
import type { Note, Folder, AppSettings } from '../../../src/types'

describe('backup', () => {
  it('builds and restores backup payload', () => {
    const note: Note = {
      id: 'n1',
      title: 'Hello',
      content: '# Hello',
      tags: ['work'],
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
      getNoteList: () => [{ id: 'n1', title: 'Hello', updatedAt: 2, folderId: 'f1', tags: ['work'] }],
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
    expect(backup.version).toBe(BACKUP_VERSION)
    expect(backup.notes).toHaveLength(1)

    const json = JSON.stringify(backup)
    const parsed = parseBackup(json)
    applyBackup(parsed, storage)

    expect(savedFolders).toEqual(folders)
    expect(savedNotes).toHaveLength(1)
    expect(savedSettings.sidebarExpandedFolderIds).toEqual(['f1'])
  })
})

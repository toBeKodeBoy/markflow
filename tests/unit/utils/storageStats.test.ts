import { describe, it, expect } from 'vitest'
import { estimateStorageUsage, formatStorageBytes } from '../../../src/utils/storageStats'
import type { Note, NoteListItem, Folder, AppSettings } from '../../../src/types'
import type { AssetIndexItem, AssetRecord } from '../../../src/types/asset'

describe('storageStats', () => {
  describe('formatStorageBytes', () => {
    it('formats bytes and kilobytes', () => {
      expect(formatStorageBytes(512)).toBe('512 B')
      expect(formatStorageBytes(2048)).toBe('2.0 KB')
    })
  })

  describe('estimateStorageUsage', () => {
    it('aggregates note and asset payload sizes', async () => {
      const note: Note = {
        id: 'n1',
        title: 'T',
        content: 'hello world',
        tags: [],
        createdAt: 1,
        updatedAt: 2,
      }
      const listItem: NoteListItem = { id: 'n1', title: 'T', updatedAt: 2 }
      const folders: Folder[] = [{ id: 'f1', name: 'docs', order: 0 }]
      const settings: AppSettings = {
        theme: 'light',
        fontSize: 14,
        editorFontFamily: 'monospace',
        previewVisible: true,
        sidebarVisible: true,
      }
      const assetIndex: AssetIndexItem[] = [
        { id: 'a1', mimeType: 'image/png', size: 100, createdAt: 1 },
      ]
      const assetRecord: AssetRecord = {
        meta: { id: 'a1', mimeType: 'image/png', size: 100, createdAt: 1 },
        data: 'abcd',
      }

      const stats = await estimateStorageUsage(
        {
          getNoteList: () => [listItem],
          getNote: (id) => (id === 'n1' ? note : null),
          getFolderList: () => folders,
          getSettings: () => settings,
        },
        {
          getIndex: () => assetIndex,
          getAsset: async (id) => (id === 'a1' ? assetRecord : null),
        }
      )

      expect(stats.noteCount).toBe(1)
      expect(stats.folderCount).toBe(1)
      expect(stats.assetCount).toBe(1)
      expect(stats.estimatedBytes).toBeGreaterThan(0)
      expect(stats.estimatedLabel).toMatch(/B|KB|MB/)
    })
  })
})

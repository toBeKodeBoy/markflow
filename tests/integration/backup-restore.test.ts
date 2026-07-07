import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNoteStore } from '../../src/stores/note'
import { buildBackup, parseBackup } from '../../src/utils/backup'

describe('backup restore integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('export and restore preserves notes folders and tags', async () => {
    const store = useNoteStore()
    const folder = store.createFolder('docs')
    const note = store.createNoteWithContent('# Hello\nworld', folder.id)
    store.addTag(note.id, 'work')

    const backup = await store.exportLibraryBackup()
    const json = JSON.stringify(backup)

    await store.clearAllLibraryData()
    expect(store.noteList).toHaveLength(0)

    const restored = await store.restoreLibraryBackup(json)
    expect(restored.notes).toHaveLength(1)
    expect(store.noteList).toHaveLength(1)
    expect(store.noteList[0].tags).toEqual(['work'])
    expect(store.folderList).toHaveLength(1)
    expect(parseBackup(json).version).toBe(2)
  })
})

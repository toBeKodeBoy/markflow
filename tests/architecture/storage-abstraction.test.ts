import { describe, it, expect, beforeEach } from 'vitest'

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

/**
 * @file tests/unit/stores/editorTabs.test.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNoteStore } from '../../../src/stores/note'
import { useEditorTabsStore } from '../../../src/stores/editorTabs'
import { MAX_EDITOR_TABS } from '../../../src/constants'
import { useStorage } from '../../../src/composables/useStorage'

describe('useEditorTabsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('openTab opens and activates the note', () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const note = noteStore.createNoteWithContent('# Tab A\n')
    noteStore.setActiveNote(null, '')

    tabsStore.openTab(note.id)

    expect(tabsStore.tabs).toHaveLength(1)
    expect(tabsStore.activeTabId).toBe(note.id)
    expect(noteStore.currentNote?.id).toBe(note.id)
    expect(noteStore.liveContent).toBe('# Tab A\n')
  })

  it('re-opening an existing tab only activates it', () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const a = noteStore.createNoteWithContent('# A\n')
    const b = noteStore.createNoteWithContent('# B\n')

    tabsStore.openTab(a.id)
    tabsStore.openTab(b.id)
    tabsStore.openTab(a.id)

    expect(tabsStore.tabs).toHaveLength(2)
    expect(tabsStore.activeTabId).toBe(a.id)
  })

  it('setTabLiveContent marks a tab dirty', () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const note = noteStore.createNoteWithContent('# A\n')
    tabsStore.openTab(note.id)

    tabsStore.setTabLiveContent(note.id, '# A changed\n')

    expect(tabsStore.isTabDirtyForTab(tabsStore.tabs[0])).toBe(true)
    expect(noteStore.liveContent).toBe('# A changed\n')
  })

  it('flushTab persists changes and clears dirty state', () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const note = noteStore.createNoteWithContent('# A\n')
    tabsStore.openTab(note.id)
    tabsStore.setTabLiveContent(note.id, '# Saved\n')

    tabsStore.flushTab(note.id)

    expect(tabsStore.isTabDirtyForTab(tabsStore.tabs[0])).toBe(false)
    expect(noteStore.noteList[0].title).toBe('Saved')
  })

  it('refuses to open more than max tabs', () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()

    for (let i = 0; i < MAX_EDITOR_TABS; i++) {
      const note = noteStore.createNoteWithContent(`# N${i}\n`)
      tabsStore.openTab(note.id)
    }

    const extra = noteStore.createNoteWithContent('# Extra\n')
    tabsStore.openTab(extra.id)

    expect(tabsStore.tabs).toHaveLength(MAX_EDITOR_TABS)
    expect(tabsStore.tabs.some((t) => t.noteId === extra.id)).toBe(false)
  })

  it('restoreFromSettings restores the open tabs list', () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const a = noteStore.createNoteWithContent('# A\n')
    const b = noteStore.createNoteWithContent('# B\n')
    tabsStore.openTab(a.id)
    tabsStore.openTab(b.id)
    tabsStore.persistTabs()

    setActivePinia(createPinia())
    const noteStore2 = useNoteStore()
    const tabsStore2 = useEditorTabsStore()
    noteStore2.loadNoteList()
    tabsStore2.restoreFromSettings()

    expect(tabsStore2.tabs.map((t) => t.noteId)).toEqual([a.id, b.id])
    expect(tabsStore2.activeTabId).toBe(b.id)
  })

  it('closeOtherTabs keeps only the target tab and activates it', () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const a = noteStore.createNoteWithContent('# A\n')
    const b = noteStore.createNoteWithContent('# B\n')
    const c = noteStore.createNoteWithContent('# C\n')

    tabsStore.openTab(a.id)
    tabsStore.openTab(b.id)
    tabsStore.openTab(c.id)

    tabsStore.closeOtherTabs(b.id, { save: false })

    expect(tabsStore.tabs.map((tab) => tab.noteId)).toEqual([b.id])
    expect(tabsStore.activeTabId).toBe(b.id)
    expect(noteStore.currentNote?.id).toBe(b.id)
  })

  it('closeAllTabs supports an empty zero-tab state', () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const note = noteStore.createNoteWithContent('# A\n')

    tabsStore.openTab(note.id)
    tabsStore.closeAllTabs({ save: false })

    expect(tabsStore.tabs).toHaveLength(0)
    expect(tabsStore.activeTabId).toBeNull()
    expect(noteStore.currentNote).toBeNull()
    expect(noteStore.liveContent).toBe('')
  })

  it('closeAllTabs saves dirty tabs when requested', () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const storage = useStorage()
    const a = noteStore.createNoteWithContent('# A\n')
    const b = noteStore.createNoteWithContent('# B\n')

    tabsStore.openTab(a.id)
    tabsStore.openTab(b.id)
    tabsStore.setTabLiveContent(a.id, '# A saved\n')
    tabsStore.setTabLiveContent(b.id, '# B saved\n')

    tabsStore.closeAllTabs({ save: true })

    expect(storage.getNote(a.id)?.content).toBe('# A saved\n')
    expect(storage.getNote(b.id)?.content).toBe('# B saved\n')
  })

  it('closeAllTabs discards dirty drafts when save is false', () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const storage = useStorage()
    const note = noteStore.createNoteWithContent('# A\n')

    tabsStore.openTab(note.id)
    tabsStore.setTabLiveContent(note.id, '# A draft\n')
    tabsStore.closeAllTabs({ save: false })

    expect(storage.getNote(note.id)?.content).toBe('# A\n')
  })

  it('getTabDisplayTitle uses locked source title for imported notes', () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const note = noteStore.createNoteWithContent('# 001\n正文', {
      title: '002',
      sourceFilePath: 'D:\\docs\\002.md',
      titleLockedFromSource: true,
    })

    tabsStore.openTab(note.id)

    expect(tabsStore.getTabDisplayTitle(tabsStore.tabs[0])).toBe('002')
  })

  it('getTabDisplayTitle stays consistent with renamed note title', () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const note = noteStore.createNoteWithContent('# 入门练习\n正文')

    tabsStore.openTab(note.id)
    noteStore.renameNote(note.id, '入门练习001')

    expect(tabsStore.getTabDisplayTitle(tabsStore.tabs[0])).toBe('入门练习001')
  })
})

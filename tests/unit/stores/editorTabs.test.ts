/**
 * @file tests/unit/stores/editorTabs.test.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNoteStore } from '../../../src/stores/note'
import { useEditorTabsStore } from '../../../src/stores/editorTabs'
import { MAX_EDITOR_TABS } from '../../../src/constants'

describe('useEditorTabsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('openTab 应打开并激活笔记', () => {
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

  it('重复 openTab 应激活已有 Tab', () => {
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

  it('setTabLiveContent 应标记 dirty', () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const note = noteStore.createNoteWithContent('# A\n')
    tabsStore.openTab(note.id)

    tabsStore.setTabLiveContent(note.id, '# A changed\n')

    expect(tabsStore.isTabDirtyForTab(tabsStore.tabs[0])).toBe(true)
    expect(noteStore.liveContent).toBe('# A changed\n')
  })

  it('flushTab 应持久化并清除 dirty', () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const note = noteStore.createNoteWithContent('# A\n')
    tabsStore.openTab(note.id)
    tabsStore.setTabLiveContent(note.id, '# Saved\n')

    tabsStore.flushTab(note.id)

    expect(tabsStore.isTabDirtyForTab(tabsStore.tabs[0])).toBe(false)
    expect(noteStore.noteList[0].title).toBe('Saved')
  })

  it('超过 maxTabs 应拒绝新开 Tab', () => {
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

  it('restoreFromSettings 应恢复 Tab 列表', () => {
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
})

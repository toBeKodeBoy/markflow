import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNoteStore } from '../../../src/stores/note'
import { useEditorTabsStore } from '../../../src/stores/editorTabs'
import { useAppSettings } from '../../../src/composables/useAppSettings'
import { WELCOME_NOTE_CONTENT } from '../../../src/constants/welcomeNote'

describe('openTutorialNote', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('首次点击创建教程笔记并打开，再次点击不重复创建', () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()

    tabsStore.openTutorialNote()
    expect(noteStore.noteList).toHaveLength(1)
    expect(noteStore.getNoteContentById(noteStore.noteList[0].id)).toContain('markflow:tutorial')
    expect(tabsStore.activeTabId).toBe(noteStore.noteList[0].id)
    const firstId = noteStore.noteList[0].id
    expect(useAppSettings().get().tutorialNoteId).toBe(firstId)

    tabsStore.closeAllTabs({ save: false })
    tabsStore.openTutorialNote()

    expect(noteStore.noteList).toHaveLength(1)
    expect(tabsStore.activeTabId).toBe(firstId)
  })

  it('教程笔记被删除后再次打开会重建', () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    tabsStore.openTutorialNote()
    const firstId = noteStore.noteList[0].id
    noteStore.deleteNote(firstId)

    tabsStore.openTutorialNote()

    expect(noteStore.noteList).toHaveLength(1)
    expect(noteStore.noteList[0].id).not.toBe(firstId)
    expect(noteStore.getNoteContentById(noteStore.noteList[0].id)).toBe(WELCOME_NOTE_CONTENT)
  })
})

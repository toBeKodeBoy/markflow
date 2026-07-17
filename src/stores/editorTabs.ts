import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useNoteStore } from './note'
import { useAppSettings } from '../composables/useAppSettings'
import { useStorage } from '../composables/useStorage'
import { MAX_EDITOR_TABS } from '../constants'
import { WELCOME_NOTE_CONTENT } from '../constants/welcomeNote'
import { extractNoteTitle } from '../utils/noteTitle'
import { showAppNotification } from '../utils/notify'
import {
  setTabContentCache,
  getTabContentCache,
  deleteTabContentCache,
  clearTabContentCache,
} from './tabContentCache'
import { registerEditorTabsBridge } from './editorTabsBridge'
import type { EditorTab } from '../types'

type SaveBehavior = { save: boolean }
type TabCloseScope = 'current' | 'others' | 'all'

export function isTabDirty(tab: EditorTab, liveContent?: string): boolean {
  const live = liveContent ?? tab.liveContent
  return live !== tab.savedContent
}

export const useEditorTabsStore = defineStore('editorTabs', () => {
  const storage = useStorage()
  const tabs = ref<EditorTab[]>([])
  const activeTabId = ref<string | null>(null)

  const activeTab = computed(() => tabs.value.find((t) => t.noteId === activeTabId.value) ?? null)

  function findTab(noteId: string): EditorTab | undefined {
    return tabs.value.find((t) => t.noteId === noteId)
  }

  function getTabDisplayTitle(tab: EditorTab): string {
    return extractNoteTitle(tab.liveContent)
  }

  function persistTabs(): void {
    const { save } = useAppSettings()
    save({
      editorTabs: {
        openNoteIds: tabs.value.map((t) => t.noteId),
        activeNoteId: activeTabId.value,
      },
    })
  }

  function syncTabCache(tab: EditorTab): void {
    setTabContentCache(tab.noteId, tab.liveContent)
  }

  function addTabFromNote(noteId: string, content: string): EditorTab {
    const tab: EditorTab = { noteId, liveContent: content, savedContent: content }
    tabs.value.push(tab)
    syncTabCache(tab)
    return tab
  }

  function activateTab(noteId: string): void {
    const noteStore = useNoteStore()
    if (activeTabId.value === noteId) return

    if (activeTabId.value) flushTab(activeTabId.value)

    const tab = findTab(noteId)
    if (!tab) return

    activeTabId.value = noteId
    const note = storage.getNote(noteId)
    if (note) {
      noteStore.setActiveNote(note, tab.liveContent)
      noteStore.applyLargeFilePolicy(tab.liveContent)
    }
    persistTabs()
  }

  function openTab(noteId: string, opts: { activate?: boolean } = {}): void {
    const activate = opts.activate !== false
    const existing = findTab(noteId)
    if (existing) {
      if (activate) activateTab(noteId)
      return
    }

    if (tabs.value.length >= MAX_EDITOR_TABS) {
      showAppNotification(`最多同时打开 ${MAX_EDITOR_TABS} 个标签页`)
      return
    }

    const note = storage.getNote(noteId)
    if (!note) return

    addTabFromNote(noteId, note.content)
    if (activate) activateTab(noteId)
    else persistTabs()
  }

  function setTabLiveContent(noteId: string, content: string): void {
    const tab = findTab(noteId)
    if (!tab) return
    tab.liveContent = content
    syncTabCache(tab)
    if (activeTabId.value === noteId) {
      useNoteStore().setLiveContent(content)
    }
  }

  function tabLiveContent(tab: EditorTab): string {
    const noteStore = useNoteStore()
    if (noteStore.currentNote?.id === tab.noteId) return noteStore.liveContent
    return getTabContentCache(tab.noteId) ?? tab.liveContent
  }

  function isTabDirtyForTab(tab: EditorTab): boolean {
    return isTabDirty(tab, tabLiveContent(tab))
  }

  function flushTab(noteId: string): void {
    const tab = findTab(noteId)
    if (!tab) return
    const noteStore = useNoteStore()
    const content =
      noteStore.currentNote?.id === noteId
        ? noteStore.liveContent
        : (getTabContentCache(noteId) ?? tab.liveContent)
    tab.liveContent = content
    syncTabCache(tab)
    if (!isTabDirty(tab, content)) return
    noteStore.updateNoteContent(noteId, content)
    tab.savedContent = content
  }

  function flushActiveTab(): void {
    if (activeTabId.value) flushTab(activeTabId.value)
  }

  function pickNextActiveId(closedId: string): string | null {
    const idx = tabs.value.findIndex((t) => t.noteId === closedId)
    if (idx < 0) return tabs.value[0]?.noteId ?? null
    const right = tabs.value[idx + 1]
    if (right) return right.noteId
    const left = tabs.value[idx - 1]
    return left?.noteId ?? null
  }

  function removeTabEntry(noteId: string): void {
    tabs.value = tabs.value.filter((t) => t.noteId !== noteId)
    deleteTabContentCache(noteId)
  }

  function clearActiveEditorState(): void {
    activeTabId.value = null
    useNoteStore().setActiveNote(null, '')
  }

  function getCloseTargetIds(scope: TabCloseScope, noteId?: string): string[] {
    if (scope === 'all') return tabs.value.map((tab) => tab.noteId)
    if (!noteId || !findTab(noteId)) return []
    if (scope === 'current') return [noteId]
    return tabs.value.filter((tab) => tab.noteId !== noteId).map((tab) => tab.noteId)
  }

  function getDirtyTabIds(noteIds: string[]): string[] {
    return noteIds.filter((id) => {
      const tab = findTab(id)
      return tab ? isTabDirtyForTab(tab) : false
    })
  }

  function applyTabClose(noteIds: string[], opts: SaveBehavior, preferredActiveId: string | null = null): void {
    if (noteIds.length === 0) return

    const uniqueIds = [...new Set(noteIds)].filter((id) => !!findTab(id))
    if (uniqueIds.length === 0) return

    if (opts.save) {
      for (const id of uniqueIds) flushTab(id)
    }

    const closingIds = new Set(uniqueIds)
    const currentActiveId = activeTabId.value
    const activeWillClose = !!currentActiveId && closingIds.has(currentActiveId)
    const fallbackNextId = activeWillClose && currentActiveId ? pickNextActiveId(currentActiveId) : null

    for (const id of uniqueIds) removeTabEntry(id)

    if (tabs.value.length === 0) {
      clearActiveEditorState()
      persistTabs()
      return
    }

    if (preferredActiveId && findTab(preferredActiveId)) {
      if (activeTabId.value !== preferredActiveId) {
        activateTab(preferredActiveId)
      } else {
        persistTabs()
      }
      return
    }

    if (activeWillClose) {
      const nextId = fallbackNextId && findTab(fallbackNextId) ? fallbackNextId : tabs.value[0]?.noteId ?? null
      if (nextId) activateTab(nextId)
      else {
        clearActiveEditorState()
        persistTabs()
      }
      return
    }

    persistTabs()
  }

  function closeCurrentTab(noteId: string, opts: SaveBehavior): void {
    const tab = findTab(noteId)
    if (!tab) return
    applyTabClose([noteId], opts, null)
  }

  function closeOtherTabs(noteId: string, opts: SaveBehavior): void {
    const targetIds = getCloseTargetIds('others', noteId)
    applyTabClose(targetIds, opts, noteId)
  }

  function closeAllTabs(opts: SaveBehavior): void {
    const targetIds = getCloseTargetIds('all')
    applyTabClose(targetIds, opts, null)
  }

  function closeTab(noteId: string): boolean {
    const tab = findTab(noteId)
    if (!tab) return true

    if (isTabDirtyForTab(tab)) {
      const title = getTabDisplayTitle(tab)
      const save = window.confirm(`“${title}” 有未保存的更改，是否保存？\n确定 = 保存并关闭，取消 = 不关闭`)
      if (!save) return false
      closeCurrentTab(noteId, { save: true })
      return true
    }

    closeCurrentTab(noteId, { save: false })
    return true
  }

  function openWelcomeTab(): void {
    const noteStore = useNoteStore()
    const note = noteStore.createNoteWithContent(WELCOME_NOTE_CONTENT)
    tabs.value = []
    clearTabContentCache()
    addTabFromNote(note.id, note.content)
    activateTab(note.id)
  }

  function openTabForNewNote(noteId: string): void {
    const note = storage.getNote(noteId)
    if (!note) return
    if (findTab(noteId)) {
      activateTab(noteId)
      return
    }
    if (tabs.value.length >= MAX_EDITOR_TABS) {
      showAppNotification(`最多同时打开 ${MAX_EDITOR_TABS} 个标签页`)
      activateTab(noteId)
      return
    }
    addTabFromNote(noteId, note.content)
    activateTab(noteId)
  }

  function removeTabSilently(noteId: string): void {
    const noteStore = useNoteStore()
    if (!findTab(noteId)) {
      if (noteStore.currentNote?.id === noteId) {
        if (noteStore.noteList.length > 0) {
          noteStore.openNote(noteStore.noteList[0].id)
        } else {
          noteStore.setActiveNote(null, '')
          openWelcomeTab()
        }
      }
      return
    }

    const wasActive = activeTabId.value === noteId
    const nextId = wasActive ? pickNextActiveId(noteId) : null
    removeTabEntry(noteId)

    if (!wasActive) {
      persistTabs()
      return
    }

    if (tabs.value.length === 0) {
      activeTabId.value = null
      noteStore.setActiveNote(null, '')
      openWelcomeTab()
      return
    }

    if (nextId && findTab(nextId)) activateTab(nextId)
    else if (tabs.value.length > 0) activateTab(tabs.value[0].noteId)
    persistTabs()
  }

  function restoreFromSettings(): void {
    const settings = useAppSettings().get()
    const saved = settings.editorTabs
    tabs.value = []
    clearTabContentCache()
    activeTabId.value = null

    const ids = (saved?.openNoteIds ?? []).filter((id) => storage.getNote(id))
    if (ids.length === 0) return

    for (const id of ids.slice(0, MAX_EDITOR_TABS)) {
      const note = storage.getNote(id)!
      addTabFromNote(id, note.content)
    }

    const activeId = saved?.activeNoteId
    if (activeId && findTab(activeId)) {
      activateTab(activeId)
    } else if (tabs.value.length > 0) {
      activateTab(tabs.value[0].noteId)
    }
  }

  function bootstrapAfterLoad(): void {
    if (tabs.value.length > 0) return
    const noteStore = useNoteStore()
    if (noteStore.noteList.length > 0) {
      openTab(noteStore.noteList[0].id)
    } else {
      openWelcomeTab()
    }
  }

  function resetAndOpenTab(noteId: string): void {
    tabs.value = []
    clearTabContentCache()
    activeTabId.value = null
    openTab(noteId)
  }

  function clearAllTabs(): void {
    tabs.value = []
    clearTabContentCache()
    clearActiveEditorState()
    persistTabs()
  }

  function getLiveContent(noteId: string): string | undefined {
    return findTab(noteId)?.liveContent ?? getTabContentCache(noteId)
  }

  return {
    tabs,
    activeTabId,
    activeTab,
    openTab,
    activateTab,
    closeTab,
    closeCurrentTab,
    closeOtherTabs,
    closeAllTabs,
    getCloseTargetIds,
    getDirtyTabIds,
    setTabLiveContent,
    flushTab,
    flushActiveTab,
    openWelcomeTab,
    openTabForNewNote,
    removeTabSilently,
    restoreFromSettings,
    bootstrapAfterLoad,
    getTabDisplayTitle,
    isTabDirtyForTab,
    persistTabs,
    getLiveContent,
    resetAndOpenTab,
    clearAllTabs,
  }
})

registerEditorTabsBridge({
  onNoteDeleted: (noteId) => useEditorTabsStore().removeTabSilently(noteId),
  onLibraryReset: (firstNoteId) => {
    const tabs = useEditorTabsStore()
    if (firstNoteId) tabs.resetAndOpenTab(firstNoteId)
    else tabs.clearAllTabs()
  },
})

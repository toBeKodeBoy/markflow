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
import { touchRecentNote } from '../utils/recentNotes'
import { useWorkspaceStore } from './workspace'
import type { EditorTab, ViewMode } from '../types'

type SaveBehavior = { save: boolean }
type TabCloseScope = 'current' | 'others' | 'all'

const DEFAULT_VIEW_MODE: ViewMode = 'live'
const VIEW_MODES: ViewMode[] = ['live', 'split', 'source', 'focus']

function normalizeViewMode(mode: unknown): ViewMode {
  if (mode === 'focus') return DEFAULT_VIEW_MODE
  return VIEW_MODES.includes(mode as ViewMode) ? (mode as ViewMode) : DEFAULT_VIEW_MODE
}

export function isTabDirty(tab: EditorTab, liveContent?: string): boolean {
  const live = liveContent ?? tab.liveContent
  return live !== tab.savedContent
}

export const useEditorTabsStore = defineStore('editorTabs', () => {
  const storage = useStorage()
  const tabs = ref<EditorTab[]>([])
  const activeTabId = ref<string | null>(null)
  const historyStack = ref<string[]>([])
  const historyPointer = ref(-1)
  const historyNavigating = ref(false)

  const activeTab = computed(() => tabs.value.find((t) => t.noteId === activeTabId.value) ?? null)
  const canGoBack = computed(() => historyPointer.value > 0)
  const canGoForward = computed(() => (
    historyPointer.value >= 0 && historyPointer.value < historyStack.value.length - 1
  ))

  function leaveToHomeIfEditing(): void {
    const workspace = useWorkspaceStore()
    if (workspace.view === 'editor') workspace.showHome()
  }

  function recordHistoryVisit(noteId: string): void {
    if (historyNavigating.value) return
    if (historyStack.value[historyPointer.value] === noteId) return
    const next = historyStack.value.slice(0, historyPointer.value + 1)
    next.push(noteId)
    historyStack.value = next
    historyPointer.value = next.length - 1
  }

  function removeHistoryNote(noteId: string): void {
    const current = historyStack.value[historyPointer.value]
    const next = historyStack.value.filter((id) => id !== noteId)
    if (next.length === historyStack.value.length) return
    historyStack.value = next
    if (current && current !== noteId) {
      const idx = next.lastIndexOf(current)
      historyPointer.value = idx >= 0 ? idx : next.length - 1
      return
    }
    historyPointer.value = next.length - 1
  }

  function goHistory(delta: -1 | 1): void {
    const canMove = delta < 0 ? canGoBack.value : canGoForward.value
    if (!canMove) return
    historyNavigating.value = true
    try {
      let next = historyPointer.value + delta
      while (next >= 0 && next < historyStack.value.length) {
        const id = historyStack.value[next]
        if (id && storage.getNote(id)) {
          historyPointer.value = next
          openTab(id, { recordRecent: false })
          return
        }
        next += delta
      }
    } finally {
      historyNavigating.value = false
    }
  }

  function goHistoryBack(): void {
    goHistory(-1)
  }

  function goHistoryForward(): void {
    goHistory(1)
  }

  function findTab(noteId: string): EditorTab | undefined {
    return tabs.value.find((t) => t.noteId === noteId)
  }

  function getTabDisplayTitle(tab: EditorTab): string {
    const noteStore = useNoteStore()
    const currentNote = noteStore.currentNote?.id === tab.noteId ? noteStore.currentNote : null
    const persistedNote = currentNote ?? storage.getNote(tab.noteId)
    return currentNote?.title
      ?? noteStore.noteList.find((note) => note.id === tab.noteId)?.title
      ?? persistedNote?.title
      ?? extractNoteTitle(tab.liveContent)
  }

  function persistTabs(): void {
    const { save } = useAppSettings()
    const viewModesByNoteId: Record<string, ViewMode> = {}
    for (const tab of tabs.value) {
      viewModesByNoteId[tab.noteId] = tab.viewMode
    }
    save({
      editorTabs: {
        openNoteIds: tabs.value.map((t) => t.noteId),
        activeNoteId: activeTabId.value,
        viewModesByNoteId,
      },
    })
  }

  function syncTabCache(tab: EditorTab): void {
    setTabContentCache(tab.noteId, tab.liveContent)
  }

  function addTabFromNote(
    noteId: string,
    content: string,
    viewMode: ViewMode = DEFAULT_VIEW_MODE,
  ): EditorTab {
    const tab: EditorTab = {
      noteId,
      liveContent: content,
      savedContent: content,
      viewMode: normalizeViewMode(viewMode),
    }
    tabs.value.push(tab)
    syncTabCache(tab)
    return tab
  }

  function setTabViewMode(noteId: string, mode: ViewMode): void {
    const tab = findTab(noteId)
    if (!tab) return
    // focus 为瞬时 UI 态，禁止写入文档级持久化（避免重启无手势全屏/切回误进专注）
    tab.viewMode = normalizeViewMode(mode === 'focus' ? DEFAULT_VIEW_MODE : mode)
    persistTabs()
  }

  function activateTab(noteId: string, opts: { recordRecent?: boolean } = {}): void {
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
    if (opts.recordRecent !== false) touchRecentNote(noteId)
    recordHistoryVisit(noteId)
    useWorkspaceStore().showEditor()
    persistTabs()
  }

  function openTab(noteId: string, opts: { activate?: boolean; recordRecent?: boolean } = {}): void {
    const activate = opts.activate !== false
    const existing = findTab(noteId)
    if (existing) {
      if (activate) activateTab(noteId, { recordRecent: opts.recordRecent })
      return
    }

    if (tabs.value.length >= MAX_EDITOR_TABS) {
      showAppNotification(`最多同时打开 ${MAX_EDITOR_TABS} 个标签页`)
      return
    }

    const note = storage.getNote(noteId)
    if (!note) return

    const settings = useAppSettings().get()
    const savedMode = settings.editorTabs?.viewModesByNoteId?.[noteId]
    addTabFromNote(noteId, note.content, normalizeViewMode(savedMode))
    if (activate) activateTab(noteId, { recordRecent: opts.recordRecent })
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
      leaveToHomeIfEditing()
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
        leaveToHomeIfEditing()
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

  function openTutorialNote(): void {
    const noteStore = useNoteStore()
    const existingId = useAppSettings().get().tutorialNoteId
    if (existingId && noteStore.noteList.some((item) => item.id === existingId)) {
      openTab(existingId)
      return
    }
    const note = noteStore.createNoteWithContent(WELCOME_NOTE_CONTENT)
    useAppSettings().save({ tutorialNoteId: note.id })
    openTabForNewNote(note.id)
  }

  function openWelcomeTab(): void {
    openTutorialNote()
  }

  function openTabForNewNote(noteId: string): void {
    const note = storage.getNote(noteId)
    if (!note) return
    if (findTab(noteId)) {
      setTabViewMode(noteId, 'live')
      activateTab(noteId)
      return
    }
    if (tabs.value.length >= MAX_EDITOR_TABS) {
      showAppNotification(`最多同时打开 ${MAX_EDITOR_TABS} 个标签页`)
      activateTab(noteId)
      return
    }
    addTabFromNote(noteId, note.content, 'live')
    activateTab(noteId)
  }

  function leaveEmptyWorkspace(): void {
    const noteStore = useNoteStore()
    activeTabId.value = null
    noteStore.setActiveNote(null, '')
    leaveToHomeIfEditing()
    persistTabs()
  }

  function removeTabSilently(noteId: string): void {
    const noteStore = useNoteStore()
    if (!findTab(noteId)) {
      if (noteStore.currentNote?.id === noteId) {
        if (noteStore.noteList.length > 0) {
          noteStore.openNote(noteStore.noteList[0].id)
        } else {
          noteStore.setActiveNote(null, '')
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
      leaveEmptyWorkspace()
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

    const savedModes = saved?.viewModesByNoteId ?? {}
    for (const id of ids.slice(0, MAX_EDITOR_TABS)) {
      const note = storage.getNote(id)!
      addTabFromNote(id, note.content, normalizeViewMode(savedModes[id]))
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
    leaveToHomeIfEditing()
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
    openTutorialNote,
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
    setTabViewMode,
    findTab,
    canGoBack,
    canGoForward,
    goHistoryBack,
    goHistoryForward,
    removeHistoryNote,
  }
})

registerEditorTabsBridge({
  onNoteDeleted: (noteId) => {
    const tabs = useEditorTabsStore()
    tabs.removeTabSilently(noteId)
    tabs.removeHistoryNote(noteId)
  },
  onLibraryReset: (firstNoteId) => {
    const tabs = useEditorTabsStore()
    if (firstNoteId) tabs.resetAndOpenTab(firstNoteId)
    else tabs.clearAllTabs()
  },
})

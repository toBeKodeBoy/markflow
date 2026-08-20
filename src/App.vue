<template>
  <div :class="['app', 'mode-' + viewMode]">
    <Toolbar
      :tocVisible="tocVisible"
      :toc-available="isEditorView"
      @toggleSidebar="sidebarVisible = !sidebarVisible"
      @toggleToc="toggleToc"
      @openSearch="toggleSearchModal"
    />

    <button
      class="focus-exit-btn btn-icon"
      title="退出专注模式（Esc）"
      aria-label="退出专注模式"
      @click="exitFocus"
    >
      <AppIcon name="close" :size="14" />
      <span>退出专注</span>
    </button>

    <div class="workspace">
      <Sidebar v-if="showSidebar" @open-settings="openSettingsModal" />

      <main class="workspace-main">
        <div
          v-if="isEditorView && viewMode !== 'focus'"
          class="workspace-chrome-bar"
          data-testid="workspace-chrome-bar"
        >
          <EditorTabBar />
        </div>

        <div class="workspace-editor-row">
          <div class="editor-stage">
            <EmptyHome
              v-if="isHomeView"
              @create="openCreateModal('note')"
              @open-search="searchModalVisible = true"
              @open-settings="openSettingsModal"
            />

            <div
              v-else-if="isTrashView"
              data-testid="workspace-trash"
              class="workspace-trash"
            >
              <TrashPanel
                :visible="true"
                embedded
                @close="onCloseTrash"
                @restore-note="onRestoreFromTrash"
              />
            </div>

            <template v-else-if="viewMode === 'live' || viewMode === 'focus'">
              <WysiwygEditor
                v-for="tab in tabsStore.tabs"
                :key="'wysiwyg-' + tab.noteId"
                v-show="tab.noteId === tabsStore.activeTabId"
                :note-id="tab.noteId"
                :view-mode="viewMode"
                :focusMode="viewMode === 'focus'"
                class="editor-tab-pane"
                @set-view-mode="setViewMode"
              />
            </template>

            <template v-else>
              <Editor
                v-for="tab in tabsStore.tabs"
                :key="'editor-' + tab.noteId"
                v-show="tab.noteId === tabsStore.activeTabId"
                :note-id="tab.noteId"
                :view-mode="viewMode"
                class="editor-tab-pane"
                @set-view-mode="setViewMode"
              />

              <Preview v-if="viewMode === 'split'" key="preview" />
            </template>
          </div>

          <Toc v-if="isEditorView && tocVisible && viewMode !== 'focus'" :view-mode="viewMode" />
        </div>
      </main>
    </div>

    <footer v-if="viewMode !== 'focus'" class="status-bar">
      <span class="status-bar-left">{{ isEditorView ? saveStatusText : '就绪' }}</span>
      <span v-if="isEditorView" class="status-bar-right">{{ charCount }} 字</span>
    </footer>

    <ImageLightbox />

    <CreateEntryModal
      :visible="createModalVisible"
      :default-kind="createModalKind"
      :default-parent-id="store.activeFolderId ?? undefined"
      :folders="store.folderList"
      :active-folder-id="store.activeFolderId"
      @cancel="createModalVisible = false"
      @created="handleCreated"
    />

    <SearchModal
      :visible="searchModalVisible"
      @close="searchModalVisible = false"
      @select="onSearchSelect"
    />

    <SettingsModal
      :visible="settingsModalVisible"
      @confirm="onSettingsConfirm"
      @cancel="settingsModalVisible = false"
      @import-folder="onSettingsImportFolder"
      @backup-restored="settingsModalVisible = false"
      @library-cleared="settingsModalVisible = false"
    />

    <ImportFolderModal
      :visible="importFolderVisible"
      :scan="importFolderScan"
      @cancel="closeImportFolder"
      @done="closeImportFolder"
    />

    <OnboardingCoach
      :visible="onboardingVisible && workspace.view === 'home'"
      :step="onboardingStep"
      :total="3"
      @skip="dismissOnboarding"
      @dismiss="dismissOnboarding"
      @next="nextOnboarding"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import Toolbar from './components/Toolbar.vue'
import Sidebar from './components/Sidebar.vue'
import Editor from './components/Editor.vue'
import WysiwygEditor from './components/WysiwygEditor.vue'
import Preview from './components/Preview.vue'
import Toc from './components/Toc.vue'
import ImageLightbox from './components/ImageLightbox.vue'
import CreateEntryModal from './components/CreateEntryModal.vue'
import SearchModal from './components/SearchModal.vue'
import SettingsModal from './components/SettingsModal.vue'
import ImportFolderModal from './components/ImportFolderModal.vue'
import AppIcon from './components/AppIcon.vue'
import EditorTabBar from './components/EditorTabBar.vue'
import EmptyHome from './components/EmptyHome.vue'
import TrashPanel from './components/TRashPanel.vue'
import OnboardingCoach from './components/OnboardingCoach.vue'
import { useOnboarding } from './composables/useOnboarding'
import { pickFolderScan } from './utils/importFolderDevScan'
import { useNoteStore } from './stores/note'
import { useEditorTabsStore } from './stores/editorTabs'
import { useWorkspaceStore } from './stores/workspace'
import { useTheme } from './composables/useTheme'
import { useAppSettings } from './composables/useAppSettings'
import { useImageLightbox } from './composables/useImageLightbox'
import { showAppNotification } from './utils/notify'
import { collectAncestorFolderIds } from './utils/folderTree'
import { useAutoBackup } from './composables/useAutoBackup'
import { useFullscreen } from './composables/useFullscreen'
import { autoPurgeTrash } from './utils/autoPurgeTrash'
import { isModAltKeyShortcut, isModKeyShortcut } from './utils/keyboardShortcut'
import {
  createViewModeFlashRegistry,
  provideViewModeFlash,
} from './composables/useViewModeFlash'
import type { AppSettings, ImportFolderScanResult, ViewMode } from './types'

const VIEW_MODE_SHORTCUTS: Record<string, ViewMode> = {
  j: 'live',
  k: 'split',
  l: 'source',
  m: 'focus',
}

const store = useNoteStore()
const tabsStore = useEditorTabsStore()
const workspace = useWorkspaceStore()
const viewModeFlash = createViewModeFlashRegistry()
provideViewModeFlash(viewModeFlash)

const theme = useTheme()
useAppSettings().load()

const { visible: lightboxVisible, closeLightbox } = useImageLightbox()

const viewMode = ref<ViewMode>('live')
const prevMode = ref<ViewMode>('live')
const appSettings = useAppSettings()
const { startScheduler, stopScheduler } = useAutoBackup()
const { isFullscreen, enter: enterFullscreen, exit: exitFullscreen } = useFullscreen()
const sidebarVisible = ref(appSettings.get().sidebarVisible ?? false)
const tocVisible = ref(false)
const createModalVisible = ref(false)
const createModalKind = ref<'note' | 'folder'>('note')
const searchModalVisible = ref(false)
const settingsModalVisible = ref(false)
const importFolderVisible = ref(false)
const importFolderScan = ref<ImportFolderScanResult | null>(null)

const showSidebar = computed(() => viewMode.value !== 'focus' && sidebarVisible.value)
const hasOpenTabs = computed(() => tabsStore.tabs.length > 0)
const isHomeView = computed(() => workspace.view === 'home' || (workspace.view === 'editor' && !hasOpenTabs.value))
const isTrashView = computed(() => workspace.view === 'trash')
const isEditorView = computed(() => workspace.view === 'editor' && hasOpenTabs.value)
const emptyLibrary = computed(() => store.noteList.length === 0)
const { visible: onboardingVisible, step: onboardingStep, dismiss: dismissOnboarding, next: nextOnboarding } = useOnboarding({
  emptyLibrary,
  hasOpenTabs,
})
const charCount = computed(() => store.liveContent.length || store.currentNote?.content.length || 0)

const saveStatusText = computed(() => {
  const tab = tabsStore.activeTab
  if (!tab) return ''
  return tabsStore.isTabDirtyForTab(tab) ? '未保存' : '已保存'
})

store.loadNoteList()
tabsStore.restoreFromSettings()
tabsStore.bootstrapAfterLoad()

function syncChromeToMode(mode: ViewMode) {
  if (mode === 'focus') {
    if (viewMode.value !== 'focus') prevMode.value = viewMode.value
    enterFullscreen()
  } else if (viewMode.value === 'focus' && isFullscreen.value) {
    exitFullscreen()
  }
  viewMode.value = mode
}

function setViewMode(mode: ViewMode) {
  tabsStore.flushActiveTab()
  // 进入专注时持久化进入前的模式，而非 focus 本身
  const durableMode: ViewMode =
    mode === 'focus'
      ? (viewMode.value === 'focus' ? prevMode.value : viewMode.value)
      : mode
  syncChromeToMode(mode)
  if (tabsStore.activeTabId) {
    tabsStore.setTabViewMode(tabsStore.activeTabId, durableMode === 'focus' ? 'live' : durableMode)
  }
}

function toggleToc() {
  tocVisible.value = !tocVisible.value
  store.setTocVisible(tocVisible.value)
}

function revealNoteInSidebar(noteId: string, folderId?: string) {
  const activeFolderId = folderId ?? null
  const settings = appSettings.get()
  const nextExpandedFolderIds = new Set(settings.sidebarExpandedFolderIds ?? [])

  if (folderId) {
    for (const id of collectAncestorFolderIds(folderId, store.folderList)) nextExpandedFolderIds.add(id)
    nextExpandedFolderIds.add(folderId)
  }

  appSettings.save({
    sidebarActiveFolderId: activeFolderId,
    sidebarExpandedFolderIds: [...nextExpandedFolderIds],
  })
  store.activeFolderId = activeFolderId
  tabsStore.openTabForNewNote(noteId)
}

function handleCreated(payload: { kind: 'note' | 'folder'; id: string; parentId?: string }) {
  createModalVisible.value = false

  if (payload.kind === 'note') {
    revealNoteInSidebar(payload.id, payload.parentId)
    return
  }

  const settings = appSettings.get()
  const nextExpandedFolderIds = new Set(settings.sidebarExpandedFolderIds ?? [])
  for (const id of collectAncestorFolderIds(payload.id, store.folderList)) nextExpandedFolderIds.add(id)
  nextExpandedFolderIds.add(payload.id)
  appSettings.save({
    sidebarActiveFolderId: payload.id,
    sidebarExpandedFolderIds: [...nextExpandedFolderIds],
  })
  sidebarVisible.value = true
  store.activeFolderId = payload.id
}

watch(sidebarVisible, (visible) => {
  appSettings.save({ sidebarVisible: visible })
})

watch(
  () => tabsStore.activeTabId,
  (id) => {
    if (!id) return
    const tab = tabsStore.findTab(id)
    if (!tab) return
    if (tab.viewMode === viewMode.value) return
    tabsStore.flushActiveTab()
    syncChromeToMode(tab.viewMode)
  },
  { immediate: true },
)

watch(
  () => store.pendingLargeFileSwitch,
  (pending) => {
    if (!pending) return
    if (viewMode.value === 'live' || viewMode.value === 'focus') {
      setViewMode('split')
      showAppNotification('文件较大，已自动切换分屏模式以获得更好性能')
    }
    store.clearPendingLargeFileSwitch()
  }
)

watch(isFullscreen, (fs) => {
  if (!fs && viewMode.value === 'focus') {
    viewMode.value = prevMode.value
    if (tabsStore.activeTabId) {
      tabsStore.setTabViewMode(tabsStore.activeTabId, prevMode.value)
    }
  }
})

function exitFocus() {
  if (isFullscreen.value) exitFullscreen()
  viewMode.value = prevMode.value
  if (tabsStore.activeTabId) {
    tabsStore.setTabViewMode(tabsStore.activeTabId, prevMode.value)
  }
}

function onSearchSelect(noteId: string) {
  tabsStore.openTab(noteId)
}

function onCloseTrash() {
  workspace.showDocs(hasOpenTabs.value)
}

function onRestoreFromTrash(noteId: string) {
  tabsStore.openTab(noteId)
}

function toggleSearchModal() {
  searchModalVisible.value = !searchModalVisible.value
}

function openCreateModal(kind: 'note' | 'folder') {
  createModalKind.value = kind
  createModalVisible.value = true
}

function openSettingsModal() {
  settingsModalVisible.value = true
}

function onSettingsConfirm(settings: AppSettings) {
  settingsModalVisible.value = false
  theme.setTheme(settings.theme)
  appSettings.save({
    fontSize: settings.fontSize,
    editorFontFamily: settings.editorFontFamily,
    imageExport: settings.imageExport,
  })
}

async function onSettingsImportFolder() {
  settingsModalVisible.value = false
  const scan = await pickFolderScan()
  if (!scan) return
  importFolderScan.value = scan
  importFolderVisible.value = true
}

function closeImportFolder() {
  importFolderVisible.value = false
  importFolderScan.value = null
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'F11') {
    e.preventDefault()
    if (viewMode.value === 'focus') {
      exitFocus()
    } else {
      setViewMode('focus')
    }
    return
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && hasOpenTabs.value) {
    const mode = VIEW_MODE_SHORTCUTS[e.key.toLowerCase()]
    if (mode) {
      e.preventDefault()
      setViewMode(mode)
      viewModeFlash.flash()
      return
    }
  }
  if (e.ctrlKey || e.metaKey) {
    if (isModKeyShortcut(e, 'k')) {
      e.preventDefault()
      toggleSearchModal()
      return
    }
    if (isModKeyShortcut(e, 'n')) {
      e.preventDefault()
      if (!createModalVisible.value) openCreateModal('note')
      return
    }
    if (isModAltKeyShortcut(e, 's')) {
      e.preventDefault()
      settingsModalVisible.value = !settingsModalVisible.value
      return
    }
  }
  if (e.key !== 'Escape') return
  if (searchModalVisible.value) {
    searchModalVisible.value = false
    return
  }
  if (settingsModalVisible.value) {
    settingsModalVisible.value = false
    return
  }
  if (lightboxVisible.value) {
    closeLightbox()
    return
  }
  if (workspace.view === 'trash') {
    workspace.showDocs(hasOpenTabs.value)
    return
  }
  if (viewMode.value === 'focus') exitFocus()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown, true)
  startScheduler()
  // 异步清理过期回收站条目，不阻塞首屏；保留天数读取用户设置（默认 30 天）
  const retentionDays = appSettings.settings.value?.trashRetentionDays ?? 30
  autoPurgeTrash(retentionDays).catch(err => console.error('[回收站] 自动清理失败:', err))
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown, true)
  stopScheduler()
})
</script>

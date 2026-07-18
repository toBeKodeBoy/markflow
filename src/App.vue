<template>
  <div :class="['app', 'mode-' + viewMode]">
    <Toolbar
      :viewMode="viewMode"
      :tocVisible="tocVisible"
      @toggleSidebar="sidebarVisible = !sidebarVisible"
      @setViewMode="setViewMode"
      @toggleToc="toggleToc"
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
      <Sidebar v-if="showSidebar" />

      <main class="workspace-main">
        <EditorTabBar v-if="viewMode !== 'focus'" />

        <div class="workspace-editor-row">
          <div v-if="!hasOpenTabs" data-testid="empty-tabs-state" class="empty-tabs-state">
            <h2 class="empty-tabs-title">当前没有打开的笔记</h2>
            <p class="empty-tabs-text">你可以新建一篇笔记，或者从侧边栏重新打开已有内容。</p>
            <div class="empty-tabs-actions">
              <button class="btn-primary" @click="createModalVisible = true">新建笔记</button>
              <button @click="sidebarVisible = true">从侧边栏打开</button>
            </div>
          </div>

          <template v-else-if="viewMode === 'live' || viewMode === 'focus'">
            <WysiwygEditor
              v-for="tab in tabsStore.tabs"
              :key="'wysiwyg-' + tab.noteId"
              v-show="tab.noteId === tabsStore.activeTabId"
              :note-id="tab.noteId"
              :focusMode="viewMode === 'focus'"
              class="editor-tab-pane"
            />
          </template>

          <template v-else>
            <Editor
              v-for="tab in tabsStore.tabs"
              :key="'editor-' + tab.noteId"
              v-show="tab.noteId === tabsStore.activeTabId"
              :note-id="tab.noteId"
              class="editor-tab-pane"
            />

            <Preview v-if="viewMode === 'split'" key="preview" />
          </template>

          <Toc v-if="hasOpenTabs && tocVisible && viewMode !== 'focus'" :view-mode="viewMode" />
        </div>
      </main>
    </div>

    <footer v-if="viewMode !== 'focus'" class="status-bar">
      <span class="status-bar-left">{{ saveStatusText }}</span>
      <span class="status-bar-right">{{ charCount }} 字</span>
    </footer>

    <ImageLightbox />

    <CreateEntryModal
      :visible="createModalVisible"
      default-kind="note"
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
import AppIcon from './components/AppIcon.vue'
import EditorTabBar from './components/EditorTabBar.vue'
import { useNoteStore } from './stores/note'
import { useEditorTabsStore } from './stores/editorTabs'
import { useTheme } from './composables/useTheme'
import { useAppSettings } from './composables/useAppSettings'
import { useImageLightbox } from './composables/useImageLightbox'
import { showAppNotification } from './utils/notify'
import { collectAncestorFolderIds } from './utils/folderTree'
import { useAutoBackup } from './composables/useAutoBackup'
import type { ViewMode } from './types'

const store = useNoteStore()
const tabsStore = useEditorTabsStore()

useTheme()
useAppSettings().load()

const { visible: lightboxVisible, closeLightbox } = useImageLightbox()

const viewMode = ref<ViewMode>('live')
const prevMode = ref<ViewMode>('live')
const appSettings = useAppSettings()
const { startScheduler, stopScheduler } = useAutoBackup()
const sidebarVisible = ref(appSettings.get().sidebarVisible ?? true)
const tocVisible = ref(false)
const createModalVisible = ref(false)
const searchModalVisible = ref(false)

const showSidebar = computed(() => viewMode.value !== 'focus' && sidebarVisible.value)
const hasOpenTabs = computed(() => tabsStore.tabs.length > 0)
const charCount = computed(() => store.liveContent.length || store.currentNote?.content.length || 0)

const saveStatusText = computed(() => {
  const tab = tabsStore.activeTab
  if (!tab) return ''
  return tabsStore.isTabDirtyForTab(tab) ? '未保存' : '已保存'
})

store.loadNoteList()
tabsStore.restoreFromSettings()
tabsStore.bootstrapAfterLoad()

function setViewMode(mode: ViewMode) {
  tabsStore.flushActiveTab()
  if (mode === 'focus') prevMode.value = viewMode.value
  viewMode.value = mode
}

function toggleToc() {
  tocVisible.value = !tocVisible.value
  store.setTocVisible(tocVisible.value)
}

function handleCreated(payload: { kind: 'note' | 'folder'; id: string; parentId?: string }) {
  createModalVisible.value = false
  const activeFolderId = payload.kind === 'note' ? (payload.parentId ?? null) : payload.id
  const expandTargetId = payload.kind === 'note' ? payload.parentId : payload.id
  const settings = appSettings.get()
  const nextExpandedFolderIds = new Set(settings.sidebarExpandedFolderIds ?? [])

  if (expandTargetId) {
    for (const id of collectAncestorFolderIds(expandTargetId, store.folderList)) nextExpandedFolderIds.add(id)
    nextExpandedFolderIds.add(expandTargetId)
  }

  appSettings.save({
    sidebarActiveFolderId: activeFolderId,
    sidebarExpandedFolderIds: [...nextExpandedFolderIds],
  })

  if (payload.kind === 'note') {
    store.activeFolderId = activeFolderId
    tabsStore.openTabForNewNote(payload.id)
    return
  }

  sidebarVisible.value = true
  store.activeFolderId = activeFolderId
}

watch(sidebarVisible, (visible) => {
  appSettings.save({ sidebarVisible: visible })
})

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

function exitFocus() {
  viewMode.value = prevMode.value
}

function onSearchSelect(noteId: string) {
  tabsStore.openTab(noteId)
}

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    searchModalVisible.value = !searchModalVisible.value
    return
  }
  if (e.key !== 'Escape') return
  if (searchModalVisible.value) {
    searchModalVisible.value = false
    return
  }
  if (lightboxVisible.value) {
    closeLightbox()
    return
  }
  if (viewMode.value === 'focus') exitFocus()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  startScheduler()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  stopScheduler()
})
</script>

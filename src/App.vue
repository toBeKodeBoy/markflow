<template>

  <div :class="['app', 'mode-' + viewMode]">

    <Toolbar

      :viewMode="viewMode"

      :tocVisible="tocVisible"

      @toggleSidebar="sidebarVisible = !sidebarVisible"

      @setViewMode="setViewMode"

      @toggleToc="toggleToc"

    />

    <EditorTabBar v-if="viewMode !== 'focus'" />

    <button

      class="focus-exit-btn btn-icon"

      @click="exitFocus"

      title="退出专注模式（Esc）"

      aria-label="退出专注模式"

    >

      <AppIcon name="close" :size="14" />

      <span>退出专注</span>

    </button>

    <div class="workspace">

      <Sidebar v-if="showSidebar" />

      <template v-if="viewMode === 'live' || viewMode === 'focus'">
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

      <Toc v-if="tocVisible && viewMode !== 'focus'" :view-mode="viewMode" />

    </div>

    <footer v-if="viewMode !== 'focus'" class="status-bar">

      <span class="status-bar-left">{{ saveStatusText }}</span>

      <span class="status-bar-right">{{ charCount }} 字</span>

    </footer>

    <ImageLightbox />

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

import AppIcon from './components/AppIcon.vue'

import EditorTabBar from './components/EditorTabBar.vue'

import { useNoteStore } from './stores/note'

import { useEditorTabsStore } from './stores/editorTabs'

import { useTheme } from './composables/useTheme'

import { useAppSettings } from './composables/useAppSettings'

import { useImageLightbox } from './composables/useImageLightbox'

import { showAppNotification } from './utils/notify'

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



const showSidebar = computed(() => viewMode.value !== 'focus' && sidebarVisible.value)



const charCount = computed(() => store.liveContent.length || store.currentNote?.content.length || 0)



const saveStatusText = computed(() => {

  const tab = tabsStore.activeTab

  if (!tab) return ''

  return tabsStore.isTabDirtyForTab(tab) ? '未保存' : '已保存'

})



store.loadNoteList()

tabsStore.restoreFromSettings()

tabsStore.bootstrapAfterLoad()



/** 切换视图模式：进入专注模式时保存前一个模式用于退出恢复 */

function setViewMode(mode: ViewMode) {

  tabsStore.flushActiveTab()

  if (mode === 'focus') prevMode.value = viewMode.value

  viewMode.value = mode

}



/** 切换目录面板显隐并同步到 store */

function toggleToc() {

  tocVisible.value = !tocVisible.value

  store.setTocVisible(tocVisible.value)

}



watch(sidebarVisible, (visible) => {

  appSettings.save({ sidebarVisible: visible })

})



watch(() => store.pendingLargeFileSwitch, (pending) => {

  if (!pending) return

  if (viewMode.value === 'live' || viewMode.value === 'focus') {

    setViewMode('split')

    showAppNotification('文件较大，已自动切换分屏模式以获得更好性能')

  }

  store.clearPendingLargeFileSwitch()

})



/** 退出专注模式，恢复为前一个视图模式 */

function exitFocus() {

  viewMode.value = prevMode.value

}



/** 全局键盘监听：Esc 优先关闭图片预览，其次退出专注模式 */

function onKeydown(e: KeyboardEvent) {

  if (e.key !== 'Escape') return

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



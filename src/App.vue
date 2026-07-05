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

      @click="exitFocus"

      title="退出专注模式（Esc）"

      aria-label="退出专注模式"

    >

      <AppIcon name="close" :size="14" />

      <span>退出专注</span>

    </button>

    <div class="workspace">

      <Sidebar v-if="showSidebar" />

      <WysiwygEditor v-if="viewMode === 'live' || viewMode === 'focus'" :key="'wysiwyg-' + viewMode" />

      <template v-else>

        <Editor :key="'editor-' + viewMode" />

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

import { useNoteStore } from './stores/note'

import { useTheme } from './composables/useTheme'

import { useAppSettings } from './composables/useAppSettings'

import { useImageLightbox } from './composables/useImageLightbox'

import { showAppNotification } from './utils/notify'

import type { ViewMode } from './types'



const store = useNoteStore()

useTheme()

useAppSettings().load()

const { visible: lightboxVisible, closeLightbox } = useImageLightbox()



const viewMode = ref<ViewMode>('live')

const prevMode = ref<ViewMode>('live')

const appSettings = useAppSettings()

const sidebarVisible = ref(appSettings.get().sidebarVisible ?? true)

const tocVisible = ref(false)



const showSidebar = computed(() => viewMode.value !== 'focus' && sidebarVisible.value)



const charCount = computed(() => store.liveContent.length || store.currentNote?.content.length || 0)



const saveStatusText = computed(() => {

  if (!store.currentNote) return ''

  return store.liveContent !== store.currentNote.content ? '未保存' : '已保存'

})



store.loadNoteList()

if (store.noteList.length > 0) {

  store.openNote(store.noteList[0].id)

} else {

  store.createNote()

  store.updateCurrentContent(`# 欢迎使用 MarkFlow 👋



> **MarkFlow** 是一款基于 uTools 的本地 Markdown 编辑器，随叫随到，专注写作。



## 快速开始



- 在左侧点击 **+ 新建** 创建笔记

- 左侧为编辑区，右侧为实时预览

- 支持 **加粗**、*斜体*、\`代码\` 等 Markdown 语法

- 点击顶部 **文件 → 导出 Markdown** 导出 .md 文件



## 快捷键



| 操作 | 快捷键 |

| --- | --- |

| 撤销 | Ctrl+Z |

| 重做 | Ctrl+Y |

| 缩进 | Tab |

| 反缩进 | Shift+Tab |



## 代码示例



\`\`\`javascript

console.log('Hello, MarkFlow!')

\`\`\`



---



_开始你的创作之旅吧！_

`)

}



/** 切换视图模式：进入专注模式时保存前一个模式用于退出恢复 */

function setViewMode(mode: ViewMode) {

  if (store.liveContent !== (store.currentNote?.content ?? '')) {

    store.updateCurrentContent(store.liveContent)

  }

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

})



onBeforeUnmount(() => {

  window.removeEventListener('keydown', onKeydown)

})

</script>



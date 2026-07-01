<template>
  <div :class="['app', 'mode-' + viewMode]">
    <Toolbar
      :viewMode="viewMode"
      :tocVisible="tocVisible"
      @toggleSidebar="sidebarVisible = !sidebarVisible"
      @setViewMode="setViewMode"
      @toggleToc="toggleToc"
    />
    <button class="focus-exit-btn btn-icon" @click="exitFocus" title="退出专注模式（Esc）">✕ 退出专注</button>
    <div class="workspace">
      <Sidebar v-if="showSidebar" />
      <WysiwygEditor v-if="viewMode === 'live' || viewMode === 'focus'" :key="'wysiwyg-' + viewMode" />
      <template v-else>
        <Editor :key="'editor-' + viewMode" />
        <Preview v-if="viewMode === 'split'" key="preview" />
      </template>
      <Toc v-if="tocVisible && viewMode !== 'focus'" />
    </div>
    <Transition name="app-toast">
      <div v-if="toastMessage" class="app-toast" role="status" aria-live="polite">
        {{ toastMessage }}
      </div>
    </Transition>
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
import { useNoteStore } from './stores/note'
import { useTheme } from './composables/useTheme'
import { onAppNotification, showAppNotification } from './utils/notify'
import type { ViewMode } from './types'

const store = useNoteStore()
useTheme()

const viewMode = ref<ViewMode>('live')
const prevMode = ref<ViewMode>('live')
const sidebarVisible = ref(true)
const tocVisible = ref(false)
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null
let removeNotificationListener: (() => void) | null = null

const showSidebar = computed(() => viewMode.value !== 'focus' && sidebarVisible.value)

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
- 点击顶部 ⬇ 按钮导出 .md 文件

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

/** 全局键盘监听：Esc 退出专注模式 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && viewMode.value === 'focus') exitFocus()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  removeNotificationListener = onAppNotification((message) => {
    toastMessage.value = message
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toastMessage.value = ''
      toastTimer = null
    }, 1800)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  removeNotificationListener?.()
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

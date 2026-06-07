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
      <WysiwygEditor v-if="viewMode === 'live' || viewMode === 'focus'" />
      <template v-else-if="viewMode === 'split'">
        <Editor />
        <Preview />
      </template>
      <Editor v-else />
      <Toc v-if="tocVisible && viewMode !== 'focus'" />
    </div>
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
import { showAppNotification } from './utils/notify'

type ViewMode = 'live' | 'split' | 'source' | 'focus'

const store = useNoteStore()
const theme = useTheme()

const viewMode = ref<ViewMode>('live')
const prevMode = ref<ViewMode>('live')
const sidebarVisible = ref(true)
const tocVisible = ref(false)

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

function setViewMode(mode: ViewMode) {
  if (mode === 'focus') prevMode.value = viewMode.value
  viewMode.value = mode
}

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

function exitFocus() {
  viewMode.value = prevMode.value
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && viewMode.value === 'focus') exitFocus()
}

onMounted(() => {
  theme.init?.()
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

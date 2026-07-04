<template>
  <header class="topbar">
    <div class="topbar-left">
      <button class="btn-icon" @click="$emit('toggleSidebar')" title="切换侧边栏">☰</button>
      <div class="app-logo">
        <span class="logo-icon">M↓</span>
        <span class="logo-name">MarkFlow</span>
      </div>
    </div>

    <div class="topbar-center">
      <div class="view-mode-switcher">
        <button :class="{ active: viewMode === 'live' }" @click="emitSetViewMode('live')" title="实时预览">预览</button>
        <button :class="{ active: viewMode === 'split' }" @click="emitSetViewMode('split')" title="分屏编辑">分屏</button>
        <button :class="{ active: viewMode === 'source' }" @click="emitSetViewMode('source')" title="源代码模式">源码</button>
        <button :class="{ active: viewMode === 'focus' }" @click="emitSetViewMode('focus')" title="专注模式">专注</button>
      </div>
    </div>

    <div class="topbar-right">
      <button class="btn-action" @click="createNote" title="新建笔记">
        <span>+ 新建</span>
      </button>
      <button class="btn-icon" @click="exportNote" title="导出 .md 文件" :disabled="!store.currentNote">⬇</button>
      <button
        class="btn-icon"
        @click="openPdfModal"
        :title="pdfExporting ? '正在导出 PDF…' : '导出 PDF'"
        :disabled="!store.currentNote || pdfExporting"
      >{{ pdfExporting ? '…' : 'PDF' }}</button>
      <button class="btn-icon" @click="importNote" title="导入 .md 文件">⬆</button>
      <button class="btn-icon" :class="{ active: tocVisible }" @click="$emit('toggleToc')" title="目录">目录</button>
      <button class="btn-icon" @click="openSettings" title="设置">⚙</button>
      <button class="btn-icon" @click="theme.toggle()" :title="theme.isDark.value ? '切换亮色' : '切换暗色'">
        {{ theme.isDark.value ? '☀' : '🌙' }}
      </button>
    </div>
  </header>

  <PdfExportModal
    :visible="pdfModalVisible"
    :exporting="pdfExporting"
    @confirm="onPdfConfirm"
    @cancel="pdfModalVisible = false"
  />

  <SettingsModal
    :visible="settingsModalVisible"
    @confirm="onSettingsConfirm"
    @cancel="settingsModalVisible = false"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useNoteStore } from '../stores/note'
import { useTheme } from '../composables/useTheme'
import { exportPdf, pdfExporting, sanitizeFilename } from '../utils/exportPdf'
import { showAppNotification } from '../utils/notify'
import PdfExportModal from './PdfExportModal.vue'
import SettingsModal from './SettingsModal.vue'
import type { AppSettings, PdfExportOptions, ViewMode } from '../types'
import { useAppSettings } from '../composables/useAppSettings'

defineProps<{ viewMode: ViewMode; tocVisible: boolean }>()
const emit = defineEmits<{ toggleSidebar: []; setViewMode: [mode: ViewMode]; toggleToc: [] }>()

function emitSetViewMode(mode: ViewMode) {
  emit('setViewMode', mode)
}

const store = useNoteStore()
const theme = useTheme()
const appSettings = useAppSettings()
const pdfModalVisible = ref(false)
const settingsModalVisible = ref(false)

function openPdfModal() {
  if (!store.currentNote || pdfExporting.value) return
  pdfModalVisible.value = true
}

async function onPdfConfirm(options: PdfExportOptions) {
  pdfModalVisible.value = false
  await exportPdf(options)
}

function openSettings() {
  settingsModalVisible.value = true
}

function onSettingsConfirm(settings: AppSettings) {
  settingsModalVisible.value = false
  theme.setTheme(settings.theme)
  appSettings.save({
    fontSize: settings.fontSize,
    editorFontFamily: settings.editorFontFamily,
  })
  showAppNotification('设置已保存')
}

/** 在当前文件夹下创建新笔记 */
function createNote() {
  store.createNote(store.activeFolderId ?? undefined)
}

/** 导出当前笔记为 .md 文件（uTools 环境或浏览器下载） */
function exportNote() {
  if (!store.currentNote) return
  const content = store.liveContent
  if (content !== store.currentNote.content) {
    store.updateCurrentContent(content)
  }
  const filename = sanitizeFilename(store.currentNote.title) + '.md'
  if (typeof window.markflow !== 'undefined') {
    const ok = window.markflow.saveMarkdownFile(filename, content)
    if (ok) window.markflow.showNotification('导出成功：' + filename)
  } else {
    const blob = new Blob([content], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  }
}

/** 导入 .md 文件为笔记（uTools 环境或文件选择器） */
function importNote() {
  if (typeof window.markflow !== 'undefined') {
    const content = window.markflow.openMarkdownFile()
    if (content !== null) {
      store.createNoteWithContent(content)
      window.markflow.showNotification('导入成功')
    }
  } else {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.txt'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const content = ev.target?.result as string
        store.createNoteWithContent(content)
      }
      reader.readAsText(file)
    }
    input.click()
  }
}
</script>

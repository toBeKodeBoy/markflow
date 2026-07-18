<template>

  <header class="topbar">

    <div class="topbar-left">

      <button

        class="btn-icon"

        @click="$emit('toggleSidebar')"

        title="切换侧边栏"

        aria-label="切换侧边栏"

      >

        <AppIcon name="menu" :size="18" />

      </button>

      <div v-if="store.currentNote && folderPath" class="note-context">
        <div class="note-context-path">{{ folderPath }}</div>
      </div>

      <div v-else class="app-logo">

        <span class="logo-icon">M↓</span>

        <span class="logo-name">MarkFlow</span>

      </div>

    </div>



    <div class="topbar-center">

      <div class="view-mode-switcher">

        <button

          :class="{ active: viewMode === 'live' }"

          @click="emitSetViewMode('live')"

          title="实时编辑（WYSIWYG）"

        >编辑</button>

        <button

          :class="{ active: viewMode === 'split' }"

          @click="emitSetViewMode('split')"

          title="分屏编辑"

        >分屏</button>

        <button

          :class="{ active: viewMode === 'source' }"

          @click="emitSetViewMode('source')"

          title="源代码模式"

        >源码</button>

        <button

          :class="{ active: viewMode === 'focus' }"

          @click="emitSetViewMode('focus')"

          title="专注模式"

        >专注</button>

      </div>

    </div>



    <div class="topbar-right">

      <button class="btn-action" @click="openCreateModal('note')" title="新建笔记" aria-label="新建笔记">

        <AppIcon name="plus" :size="14" />

        <span class="btn-action-label">新建</span>

      </button>



      <div class="import-menu-wrap" ref="fileMenuRef">

        <button

          class="btn-icon btn-icon-text"

          :class="{ active: fileMenuOpen }"

          @click="toggleFileMenu"

          title="文件操作"

          aria-label="文件操作"

          aria-haspopup="menu"

          :aria-expanded="fileMenuOpen"

        >

          <AppIcon name="file-menu" :size="16" />

          <span class="btn-icon-label">文件</span>

        </button>

        <div v-if="fileMenuOpen" class="import-dropdown file-dropdown" role="menu">

          <button type="button" role="menuitem" :disabled="!store.currentNote" @click="exportNote">

            导出 Markdown

          </button>

          <button

            type="button"

            role="menuitem"

            :disabled="!store.currentNote || pdfExporting"

            @click="openPdfFromMenu"

          >

            {{ pdfExporting ? '正在导出 PDF…' : '导出 PDF' }}

          </button>

          <div class="dropdown-divider" role="separator" />

          <button type="button" role="menuitem" @click="importNote">导入文件</button>

          <button type="button" role="menuitem" @click="openImportFolder">导入文件夹</button>

        </div>

      </div>



      <button

        class="btn-icon btn-icon-text"

        :class="{ active: tocVisible }"

        @click="$emit('toggleToc')"

        title="目录"

        aria-label="目录"

      >

        <AppIcon name="toc" :size="16" />

        <span class="btn-icon-label">目录</span>

      </button>

      <button class="btn-icon" @click="openSettings" title="设置" aria-label="设置">

        <AppIcon name="settings" :size="16" />

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

    @import-folder="onSettingsImportFolder"

    @backup-restored="onBackupRestored"

    @library-cleared="onLibraryCleared"

  />



  <ImportFolderModal

    :visible="importFolderVisible"

    :scan="importFolderScan"

    @cancel="closeImportFolder"

    @done="closeImportFolder"

  />

  <CreateEntryModal
    :visible="createModalVisible"
    :default-kind="createModalKind"
    :default-parent-id="store.activeFolderId ?? undefined"
    :folders="store.folderList"
    :active-folder-id="store.activeFolderId"
    @cancel="createModalVisible = false"
    @created="handleCreated"
  />

</template>



<script setup lang="ts">

import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

import { useNoteStore } from '../stores/note'
import { useEditorTabsStore } from '../stores/editorTabs'

import { useTheme } from '../composables/useTheme'

import { exportPdf, pdfExporting, sanitizeFilename } from '../utils/exportPdf'

import { showAppNotification } from '../utils/notify'

import { pickFolderScan } from '../utils/importFolderDevScan'
import { hasRelativeImageReferences } from '../utils/importFolderHelpers'

import { collectAncestorFolderIds, getFolderPathLabel } from '../utils/folderTree'

import PdfExportModal from './PdfExportModal.vue'

import SettingsModal from './SettingsModal.vue'

import ImportFolderModal from './ImportFolderModal.vue'
import CreateEntryModal from './CreateEntryModal.vue'

import AppIcon from './AppIcon.vue'

import type { AppSettings, ImportFolderScanResult, PdfExportOptions, ViewMode } from '../types'

import { useAppSettings } from '../composables/useAppSettings'



defineProps<{ viewMode: ViewMode; tocVisible: boolean }>()

const emit = defineEmits<{ toggleSidebar: []; setViewMode: [mode: ViewMode]; toggleToc: [] }>()



function emitSetViewMode(mode: ViewMode) {

  emit('setViewMode', mode)

}



const store = useNoteStore()
const tabsStore = useEditorTabsStore()

const theme = useTheme()

const appSettings = useAppSettings()

const pdfModalVisible = ref(false)

const settingsModalVisible = ref(false)

const fileMenuOpen = ref(false)

const importFolderVisible = ref(false)
const createModalVisible = ref(false)
const createModalKind = ref<'note' | 'folder'>('note')

const importFolderScan = ref<ImportFolderScanResult | null>(null)

const fileMenuRef = ref<HTMLElement | null>(null)



const folderPath = computed(() => {

  const folderId = store.currentNote?.folderId

  if (!folderId) return ''

  return getFolderPathLabel(store.folderList, folderId)

})



function openPdfModal() {

  if (!store.currentNote || pdfExporting.value) return

  pdfModalVisible.value = true

}



function openPdfFromMenu() {

  closeFileMenu()

  openPdfModal()

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



function toggleFileMenu() {

  fileMenuOpen.value = !fileMenuOpen.value

}



function closeFileMenu() {

  fileMenuOpen.value = false

}



function onDocumentClick(e: MouseEvent) {

  if (!fileMenuOpen.value) return

  const el = fileMenuRef.value

  if (el && !el.contains(e.target as Node)) closeFileMenu()

}



onMounted(() => document.addEventListener('click', onDocumentClick))

onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))



function openCreateModal(kind: 'note' | 'folder') {
  createModalKind.value = kind
  createModalVisible.value = true
}

function handleCreated(payload: { kind: 'note' | 'folder'; id: string; parentId?: string }) {
  createModalVisible.value = false
  if (payload.kind === 'note') {
    store.activeFolderId = payload.parentId ?? null
    tabsStore.openTabForNewNote(payload.id)
    return
  }

  store.activeFolderId = payload.id
  const settings = appSettings.get()
  const nextExpandedFolderIds = new Set(settings.sidebarExpandedFolderIds ?? [])
  for (const id of collectAncestorFolderIds(payload.id, store.folderList)) nextExpandedFolderIds.add(id)
  nextExpandedFolderIds.add(payload.id)
  appSettings.save({
    sidebarExpandedFolderIds: [...nextExpandedFolderIds],
    sidebarActiveFolderId: payload.id,
  })
}



/** 导出当前笔记为 .md 文件（uTools 环境或浏览器下载） */

function exportNote() {

  closeFileMenu()

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

async function importNote() {

  closeFileMenu()

  const folderId = store.activeFolderId ?? undefined

  if (typeof window.markflow !== 'undefined') {

    const file = window.markflow.openMarkdownFile()

    if (file !== null) {

      const result = await store.importMarkdownFile(file, folderId)

      tabsStore.openTabForNewNote(result.note.id)
      const warning = result.warnings[0]
      const importWarningMessage = `\u5bfc\u5165\u5b8c\u6210\uff0c\u4f46\u56fe\u7247\u5904\u7406\u5931\u8d25\uff1a${warning}`
      if (warning) {
        window.markflow.showNotification(importWarningMessage)
        return
        window.markflow.showNotification(`导入完成，但图片处理失败：${warning}`)
        return
      }

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

        if (hasRelativeImageReferences(content)) {
          window.alert('浏览器环境下，含本地图片的 Markdown 请使用“导入文件夹”')
          return
        }

        void store.importMarkdownFile({
          content,
          path: file.name,
          name: file.name,
          images: [],
        }, folderId).then((result) => {
          tabsStore.openTabForNewNote(result.note.id)
        })

      }

      reader.readAsText(file)

    }

    input.click()

  }

}



async function openImportFolder() {

  closeFileMenu()

  const scan = await pickFolderScan()

  if (!scan) return

  importFolderScan.value = scan

  importFolderVisible.value = true

}



function onSettingsImportFolder() {

  settingsModalVisible.value = false

  void openImportFolder()

}

function onBackupRestored() {
  settingsModalVisible.value = false
}

function onLibraryCleared() {
  settingsModalVisible.value = false
}



function closeImportFolder() {

  importFolderVisible.value = false

  importFolderScan.value = null

}

</script>



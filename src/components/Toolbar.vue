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

      <div class="app-logo">

        <span class="logo-icon">M↓</span>

        <span class="logo-name">MarkFlow</span>

      </div>

      <div v-if="store.currentNote && folderPath" class="note-context">
        <div class="note-context-path">{{ folderPath }}</div>
      </div>

    </div>



    <div class="topbar-right">

      <button class="btn-primary btn-action" @click="openCreateModal('note')" title="新建笔记" aria-label="新建笔记">

        <AppIcon name="plus" :size="14" />

        <span class="btn-action-label">新建</span>

      </button>



      <button

        class="btn-icon btn-icon-text"

        data-testid="toolbar-search-btn"

        title="搜索笔记（Ctrl+K）"

        aria-label="搜索笔记"

        @click="$emit('openSearch')"

      >

        <AppIcon name="search" :size="16" />

        <span class="btn-icon-label">搜索</span>

      </button>



      <div class="import-menu-wrap" ref="fileMenuRef">

        <button

          class="btn-icon btn-icon-text"

          data-testid="toolbar-file-btn"

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
import { DEFAULT_IMAGE_EXPORT_SETTINGS, exportMarkdownAssets } from '../utils/exportMarkdownAssets'
import { resolveImageExportTarget } from '../utils/imageExportPath'

import { showAppNotification } from '../utils/notify'

import { pickFolderScan } from '../utils/importFolderDevScan'
import { hasRelativeImageReferences } from '../utils/importFolderHelpers'

import { collectAncestorFolderIds, getFolderPathLabel } from '../utils/folderTree'

import PdfExportModal from './PdfExportModal.vue'

import SettingsModal from './SettingsModal.vue'

import ImportFolderModal from './ImportFolderModal.vue'
import CreateEntryModal from './CreateEntryModal.vue'

import AppIcon from './AppIcon.vue'

import type { AppSettings, ImportFolderScanResult, PdfExportOptions } from '../types'

import { useAppSettings } from '../composables/useAppSettings'



defineProps<{ tocVisible: boolean }>()

defineEmits<{ toggleSidebar: []; toggleToc: []; openSearch: [] }>()



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

    imageExport: settings.imageExport,

  })

  showAppNotification('设置已保存')

}



function toggleFileMenu() {

  fileMenuOpen.value = !fileMenuOpen.value

}



function closeFileMenu() {

  fileMenuOpen.value = false

}

function buildExportWarningMessage(warnings: string[]): string {

  if (warnings.length === 0) return ''

  const remoteWarnings = warnings.filter((warning) => warning.startsWith('外链图片下载失败'))

  if (remoteWarnings.length > 0) {
    const firstRemoteWarning = remoteWarnings[0]
    const suffix = remoteWarnings.length > 1 ? `；另有 ${remoteWarnings.length - 1} 条同类问题` : ''
    return `导出完成，但有 ${remoteWarnings.length} 张外链图片下载失败，已保留原链接。${firstRemoteWarning}${suffix}`
  }

  const firstWarning = warnings[0]
  const suffix = warnings.length > 1 ? `；另有 ${warnings.length - 1} 条警告` : ''
  return `导出完成，但图片处理有警告：${firstWarning}${suffix}`
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

async function exportNote() {

  closeFileMenu()

  if (!store.currentNote) return

  const content = store.liveContent

  if (content !== store.currentNote.content) {

    store.updateCurrentContent(content)

  }

  const filename = sanitizeFilename(store.currentNote.title) + '.md'

  if (typeof window.markflow !== 'undefined') {

    const bridge = window.markflow

    if (bridge.selectMarkdownSavePath && bridge.writeTextFile) {
      const selected = bridge.selectMarkdownSavePath(filename)
      if (selected.ok) {
        try {
          const exported = await exportMarkdownAssets({
            markdown: content,
            markdownFilePath: selected.path,
            noteTitle: store.currentNote.title,
            managedAssetIds: store.currentNote.managedAssetIds,
            settings: {
              ...DEFAULT_IMAGE_EXPORT_SETTINGS,
              ...(appSettings.get().imageExport ?? {}),
            },
          })
          const writeResult = bridge.writeTextFile(selected.path, exported.markdown)
          if (!writeResult.ok) {
            bridge.showNotification('Markdown 导出失败')
            return
          }
          const exportSettings = {
            ...DEFAULT_IMAGE_EXPORT_SETTINGS,
            ...(appSettings.get().imageExport ?? {}),
          }
          if (exportSettings.bindNoteOnExport) {
            const target = resolveImageExportTarget({
              markdownFilePath: selected.path,
              noteTitle: store.currentNote.title,
              mode: exportSettings.mode,
              customTemplate: exportSettings.customTemplate,
              typoraRootDir: exportSettings.typoraRootDir,
            })
            store.bindNoteToWorkingFile(store.currentNote.id, {
              workingFilePath: selected.path,
              assetDirectoryPath: target.assetDirAbsPath,
              assetDirectoryTemplate:
                exportSettings.mode === 'note-assets-folder'
                  ? './${filename}.assets'
                  : exportSettings.customTemplate,
              assetLinkStyle: target.markdownPathStyle,
              content: exported.markdown,
            })
          }
          if (exported.warnings.length > 0) {
            bridge.showNotification(buildExportWarningMessage(exported.warnings))
            return
          }
          bridge.showNotification('导出成功：' + filename)
          return
        } catch (err) {
          bridge.showNotification(err instanceof Error ? err.message : 'Markdown 导出失败')
          return
        }
      }
      if (selected.reason === 'cancel') return
    }

    const ok = bridge.saveMarkdownFile(filename, content)

    if (ok) bridge.showNotification('导出成功：' + filename)

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



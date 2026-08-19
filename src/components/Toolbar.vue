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

      <button
        type="button"
        class="btn-icon"
        data-testid="toolbar-history-back"
        title="后退"
        aria-label="后退"
        :disabled="!canGoBack"
        @click="goBack()"
      >
        <AppIcon name="chevron-left" :size="16" />
      </button>

      <button
        type="button"
        class="btn-icon"
        data-testid="toolbar-history-forward"
        title="前进"
        aria-label="前进"
        :disabled="!canGoForward"
        @click="goForward()"
      >
        <AppIcon name="chevron-right" :size="16" />
      </button>

      <div v-if="store.currentNote && folderPath" class="note-context">
        <div class="note-context-path">{{ folderPath }}</div>
      </div>
    </div>

    <div class="topbar-center">
      <button
        type="button"
        class="toolbar-search-bar"
        data-testid="toolbar-search-bar"
        data-onboarding="search"
        :title="SEARCH_DOCUMENTS_TITLE"
        :aria-label="SEARCH_DOCUMENTS_LABEL"
        @click="$emit('openSearch')"
      >
        <AppIcon name="search" :size="16" />
        <span>{{ SEARCH_DOCUMENTS_LABEL }}</span>
      </button>
    </div>

    <div class="topbar-right">
      <button
        v-if="tocAvailable"
        class="btn-icon btn-icon-text"
        :class="{ active: tocVisible }"
        @click="$emit('toggleToc')"
        title="目录"
        aria-label="目录"
      >
        <AppIcon name="toc" :size="16" />
        <span class="btn-icon-label">目录</span>
      </button>

      <div class="import-menu-wrap" ref="overflowMenuRef">
        <button
          class="btn-icon"
          data-testid="toolbar-overflow-btn"
          :class="{ active: overflowOpen }"
          @click="toggleOverflowMenu"
          title="更多"
          aria-label="更多"
          aria-haspopup="menu"
          :aria-expanded="overflowOpen"
        >
          <AppIcon name="more" :size="16" />
        </button>

        <div v-if="overflowOpen" class="import-dropdown file-dropdown" role="menu">
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

          <div class="dropdown-divider" role="separator" />

          <button
            type="button"
            role="menuitem"
            data-testid="toolbar-tutorial-btn"
            @click="openTutorial"
          >
            新手教程
          </button>
        </div>
      </div>
    </div>
  </header>

  <PdfExportModal
    :visible="pdfModalVisible"
    :exporting="pdfExporting"
    @confirm="onPdfConfirm"
    @cancel="pdfModalVisible = false"
  />

  <ImportFolderModal
    :visible="importFolderVisible"
    :scan="importFolderScan"
    @cancel="closeImportFolder"
    @done="closeImportFolder"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useNoteStore } from '../stores/note'
import { useEditorTabsStore } from '../stores/editorTabs'
import { exportPdf, pdfExporting, sanitizeFilename } from '../utils/exportPdf'
import { DEFAULT_IMAGE_EXPORT_SETTINGS, exportMarkdownAssets } from '../utils/exportMarkdownAssets'
import { resolveImageExportTarget } from '../utils/imageExportPath'
import { pickFolderScan } from '../utils/importFolderDevScan'
import { getFolderPathLabel } from '../utils/folderTree'
import PdfExportModal from './PdfExportModal.vue'
import ImportFolderModal from './ImportFolderModal.vue'
import AppIcon from './AppIcon.vue'
import type { ImportFolderScanResult, PdfExportOptions } from '../types'
import { useNoteHistory } from '../composables/useNoteHistory'
import { useAppSettings } from '../composables/useAppSettings'
import { useImportMarkdown } from '../composables/useImportMarkdown'
import {
  SEARCH_DOCUMENTS_LABEL,
  SEARCH_DOCUMENTS_TITLE,
} from '../constants/sidebarShell'

withDefaults(
  defineProps<{ tocVisible: boolean; tocAvailable?: boolean }>(),
  { tocAvailable: true },
)
defineEmits<{ toggleSidebar: []; toggleToc: []; openSearch: [] }>()

const store = useNoteStore()
const tabsStore = useEditorTabsStore()
const { importMarkdownToActiveFolder } = useImportMarkdown()
const { canGoBack, canGoForward, goBack, goForward } = useNoteHistory()
const appSettings = useAppSettings()

const pdfModalVisible = ref(false)
const overflowOpen = ref(false)
const importFolderVisible = ref(false)
const importFolderScan = ref<ImportFolderScanResult | null>(null)
const overflowMenuRef = ref<HTMLElement | null>(null)

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

  closeOverflowMenu()

  openPdfModal()

}



async function onPdfConfirm(options: PdfExportOptions) {

  pdfModalVisible.value = false

  await exportPdf(options)

}



function toggleOverflowMenu() {

  overflowOpen.value = !overflowOpen.value

}



function closeOverflowMenu() {

  overflowOpen.value = false

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

  if (!overflowOpen.value) return

  const el = overflowMenuRef.value

  if (el && !el.contains(e.target as Node)) closeOverflowMenu()

}



onMounted(() => document.addEventListener('click', onDocumentClick))

onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))



function openTutorial() {
  closeOverflowMenu()
  tabsStore.openTutorialNote()
}



/** 导出当前笔记为 .md 文件（uTools 环境或浏览器下载） */

async function exportNote() {

  closeOverflowMenu()

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
  closeOverflowMenu()
  await importMarkdownToActiveFolder()
}



async function openImportFolder() {

  closeOverflowMenu()

  const scan = await pickFolderScan()

  if (!scan) return

  importFolderScan.value = scan

  importFolderVisible.value = true

}



function closeImportFolder() {

  importFolderVisible.value = false

  importFolderScan.value = null

}

</script>



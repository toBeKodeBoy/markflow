<template>
  <div v-if="visible" class="modal-overlay" @click.self="emit('cancel')">
    <div class="modal settings-modal" role="dialog" aria-labelledby="settings-title">
      <div id="settings-title" class="modal-title">设置</div>

      <label class="settings-option-row">
        <span class="settings-option-label">主题</span>
        <select v-model="draft.theme" class="settings-option-select">
          <option value="system">跟随系统 / uTools</option>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
      </label>

      <label class="settings-option-row">
        <span class="settings-option-label">字号</span>
        <div class="settings-font-size">
          <input
            v-model.number="draft.fontSize"
            type="range"
            min="12"
            max="24"
            step="1"
            class="settings-range"
          />
          <span class="settings-font-size-value">{{ draft.fontSize }}px</span>
        </div>
      </label>

      <label class="settings-option-row">
        <span class="settings-option-label">源码字体</span>
        <select v-model="draft.editorFontFamily" class="settings-option-select">
          <option v-for="item in EDITOR_FONT_OPTIONS" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </label>

      <p class="settings-tip">
        PDF 导出选项（纸张、页边距等）可在工具栏「PDF」按钮中配置，设置会自动记住。
      </p>

      <div class="settings-section">
        <div class="settings-section-title">数据管理</div>
        <button type="button" class="settings-action-btn" @click="emit('import-folder')">
          导入文件夹…
        </button>
        <p class="settings-tip">从本地文件夹批量导入 Markdown 笔记，可选保留目录结构。</p>
        <button type="button" class="settings-action-btn" @click="exportBackup">
          导出备份…
        </button>
        <button type="button" class="settings-action-btn" @click="triggerImportBackup">
          从备份恢复…
        </button>
        <input
          ref="backupInputRef"
          type="file"
          accept="application/json,.json"
          class="settings-hidden-input"
          @change="onBackupFileSelected"
        />
        <p class="settings-tip">备份包含全部笔记、文件夹与侧栏展开状态（不含图片资源）。</p>
      </div>

      <div class="modal-actions">
        <button class="btn-primary" @click="saveSettings">保存</button>
        <button @click="emit('cancel')">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { AppSettings } from '../types'
import { clampFontSize, EDITOR_FONT_OPTIONS } from '../composables/useAppSettings'
import { useStorage } from '../composables/useStorage'
import { useNoteStore } from '../stores/note'
import { showAppNotification } from '../utils/notify'

const props = defineProps<{ visible: boolean }>()

const emit = defineEmits<{
  confirm: [settings: AppSettings]
  cancel: []
  'import-folder': []
  'backup-restored': []
}>()

const storage = useStorage()
const store = useNoteStore()
const backupInputRef = ref<HTMLInputElement>()
const draft = reactive<AppSettings>(storage.getSettings())

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    const loaded = storage.getSettings()
    draft.theme = loaded.theme
    draft.fontSize = clampFontSize(loaded.fontSize)
    draft.editorFontFamily = loaded.editorFontFamily
    draft.previewVisible = loaded.previewVisible
    draft.sidebarVisible = loaded.sidebarVisible
    draft.pdfExport = loaded.pdfExport
  }
)

function saveSettings() {
  emit('confirm', {
    ...storage.getSettings(),
    theme: draft.theme,
    fontSize: clampFontSize(draft.fontSize),
    editorFontFamily: draft.editorFontFamily,
  })
}

function exportBackup() {
  store.downloadLibraryBackup()
  showAppNotification('备份已开始下载')
}

function triggerImportBackup() {
  backupInputRef.value?.click()
}

function onBackupFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => {
    try {
      const text = String(reader.result ?? '')
      if (!window.confirm('从备份恢复将替换当前全部笔记与文件夹，并清除本地图片资源，是否继续？')) return
      await store.restoreLibraryBackup(text)
      showAppNotification('备份已恢复（图片需重新粘贴或导入）')
      emit('backup-restored')
    } catch (err) {
      showAppNotification(err instanceof Error ? err.message : '备份恢复失败')
    }
  }
  reader.readAsText(file)
}
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="onCancel">
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
        <div class="settings-section-title">自动备份</div>
        <label class="settings-option-row settings-toggle-row">
          <span class="settings-option-label">启用</span>
          <input
            v-model="autoBackupDraft.enabled"
            type="checkbox"
            class="settings-toggle"
            :disabled="!autoBackupAvailable"
            data-testid="auto-backup-enabled"
            @change="onAutoBackupEnabledChange"
          />
        </label>
        <label class="settings-option-row">
          <span class="settings-option-label">间隔</span>
          <select
            v-model.number="autoBackupDraft.intervalHours"
            class="settings-option-select"
            :disabled="!autoBackupAvailable || !autoBackupDraft.enabled"
            @change="persistAutoBackup"
          >
            <option v-for="item in AUTO_BACKUP_INTERVAL_OPTIONS" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>
        <div class="settings-option-row settings-path-row">
          <span class="settings-option-label">目录</span>
          <div class="settings-path-field">
            <span
              class="settings-path-display"
              :title="autoBackupDraft.directoryPath || ''"
            >
              {{ autoBackupDraft.directoryPath || '未选择' }}
            </span>
            <button
              type="button"
              class="settings-path-btn"
              :disabled="!autoBackupAvailable"
              data-testid="auto-backup-select-dir"
              @click="selectAutoBackupDirectory"
            >
              选择目录…
            </button>
          </div>
        </div>
        <label class="settings-option-row">
          <span class="settings-option-label">保留</span>
          <select
            v-model.number="autoBackupDraft.maxCopies"
            class="settings-option-select"
            :disabled="!autoBackupAvailable || !autoBackupDraft.enabled"
            @change="persistAutoBackup"
          >
            <option
              v-for="item in AUTO_BACKUP_MAX_COPIES_OPTIONS"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </select>
        </label>
        <p
          v-if="autoBackupStatusLabel"
          class="settings-status-line"
          :class="{ 'settings-status-line-error': autoBackupDraft.lastBackupStatus === 'error' }"
          :title="autoBackupDraft.lastBackupError || ''"
        >
          {{ autoBackupStatusLabel }}
        </p>
        <button
          type="button"
          class="settings-action-btn"
          data-testid="auto-backup-run-now"
          :disabled="!autoBackupAvailable || autoBackupBusy || !autoBackupDraft.directoryPath"
          @click="runAutoBackupNow"
        >
          {{ autoBackupBusy ? '备份中…' : '立即备份' }}
        </button>
        <p v-if="!autoBackupAvailable" class="settings-tip">
          自动备份仅在 uTools 中可用，浏览器开发环境请使用下方手动导出。
        </p>
        <p v-else class="settings-tip">启用后按设定间隔自动备份，每次成功都会通知。</p>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">数据管理</div>
        <p v-if="storageStatsLabel" class="settings-storage-stats">{{ storageStatsLabel }}</p>
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
        <p class="settings-tip">备份包含全部笔记、文件夹、侧栏状态与图片资源。</p>
        <button
          type="button"
          class="settings-action-btn danger"
          data-testid="clear-library-btn"
          @click="clearAllLibraryData"
        >
          清空全部数据…
        </button>
        <p class="settings-tip settings-tip-danger">删除全部笔记、文件夹与图片资源，不可恢复。</p>
      </div>

      <div class="modal-actions">
        <button class="btn-primary" @click="saveSettings">保存</button>
        <button @click="onCancel">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import type { AppSettings, AutoBackupSettings } from '../types'
import { clampFontSize, EDITOR_FONT_OPTIONS } from '../composables/useAppSettings'
import { useStorage } from '../composables/useStorage'
import { useNoteStore } from '../stores/note'
import { getAssetStorage } from '../composables/useAssetStorage'
import { estimateStorageUsage } from '../utils/storageStats'
import { exportBackupToFile, importBackupFromFile } from '../composables/useBackup'
import { isAutoBackupAvailable, useAutoBackup } from '../composables/useAutoBackup'
import {
  AUTO_BACKUP_INTERVAL_OPTIONS,
  AUTO_BACKUP_MAX_COPIES_OPTIONS,
  normalizeAutoBackupSettings,
} from '../utils/autoBackup'
import { showAppNotification } from '../utils/notify'

const props = defineProps<{ visible: boolean }>()

const emit = defineEmits<{
  confirm: [settings: AppSettings]
  cancel: []
  'import-folder': []
  'backup-restored': []
  'library-cleared': []
}>()

const storage = useStorage()
const store = useNoteStore()
const autoBackup = useAutoBackup()
const backupInputRef = ref<HTMLInputElement>()
const storageStatsLabel = ref('')
const autoBackupAvailable = isAutoBackupAvailable()
const autoBackupSnapshot = ref<AutoBackupSettings>(normalizeAutoBackupSettings())
const draft = reactive<AppSettings>(storage.getSettings())
const autoBackupDraft = reactive<AutoBackupSettings>(normalizeAutoBackupSettings(draft.autoBackup))

const autoBackupBusy = computed(
  () => autoBackup.backupRunning.value || autoBackupDraft.lastBackupStatus === 'running'
)

const autoBackupStatusLabel = computed(() => {
  if (autoBackupBusy.value) {
    return '上次备份：进行中…'
  }
  if (!autoBackupDraft.lastBackupAt) {
    return autoBackupDraft.enabled ? '上次备份：尚未备份' : ''
  }
  const time = new Date(autoBackupDraft.lastBackupAt).toLocaleString()
  if (autoBackupDraft.lastBackupStatus === 'error') {
    return `上次备份：${time} 失败`
  }
  if (autoBackupDraft.lastBackupStatus === 'success') {
    return `上次备份：${time} 成功`
  }
  return `上次备份：${time}`
})

function syncAutoBackupDraft(settings?: AutoBackupSettings) {
  const next = normalizeAutoBackupSettings(settings ?? storage.getSettings().autoBackup)
  autoBackupDraft.enabled = next.enabled
  autoBackupDraft.intervalHours = next.intervalHours
  autoBackupDraft.directoryPath = next.directoryPath
  autoBackupDraft.maxCopies = next.maxCopies
  autoBackupDraft.lastBackupAt = next.lastBackupAt
  autoBackupDraft.lastBackupStatus = next.lastBackupStatus
  autoBackupDraft.lastBackupPath = next.lastBackupPath
  autoBackupDraft.lastBackupError = next.lastBackupError
}

function persistAutoBackup() {
  const saved = autoBackup.saveSettings({ ...autoBackupDraft })
  syncAutoBackupDraft(saved)
  autoBackup.restartScheduler()
}

async function refreshStorageStats() {
  const stats = await estimateStorageUsage(storage, {
    getIndex: () => getAssetStorage().getAssetIndex(),
    getAsset: (id) => getAssetStorage().getAssetAsync(id),
  })
  storageStatsLabel.value = `共 ${stats.noteCount} 篇笔记 · ${stats.assetCount} 张图片 · 约 ${stats.estimatedLabel}`
}

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    const loaded = storage.getSettings()
    autoBackupSnapshot.value = normalizeAutoBackupSettings(loaded.autoBackup)
    draft.theme = loaded.theme
    draft.fontSize = clampFontSize(loaded.fontSize)
    draft.editorFontFamily = loaded.editorFontFamily
    draft.previewVisible = loaded.previewVisible
    draft.sidebarVisible = loaded.sidebarVisible
    draft.pdfExport = loaded.pdfExport
    syncAutoBackupDraft(autoBackupSnapshot.value)
    void refreshStorageStats()
  }
)

function onCancel() {
  autoBackup.saveSettings(autoBackupSnapshot.value)
  syncAutoBackupDraft(autoBackupSnapshot.value)
  autoBackup.restartScheduler()
  emit('cancel')
}

async function onAutoBackupEnabledChange() {
  if (!autoBackupDraft.enabled) {
    persistAutoBackup()
    return
  }
  if (!autoBackupDraft.directoryPath) {
    const dir = autoBackup.selectDirectory()
    if (!dir) {
      autoBackupDraft.enabled = false
      return
    }
    autoBackupDraft.directoryPath = dir
  }
  persistAutoBackup()
}

function selectAutoBackupDirectory() {
  const dir = autoBackup.selectDirectory()
  if (!dir) return
  autoBackupDraft.directoryPath = dir
  persistAutoBackup()
}

async function runAutoBackupNow() {
  await autoBackup.runBackup({ force: true })
  syncAutoBackupDraft()
}

function saveSettings() {
  emit('confirm', {
    ...storage.getSettings(),
    theme: draft.theme,
    fontSize: clampFontSize(draft.fontSize),
    editorFontFamily: draft.editorFontFamily,
  })
}

async function exportBackup() {
  const backup = await store.exportLibraryBackup()
  const json = JSON.stringify(backup, null, 2)
  const name = `markflow-backup-${new Date(backup.exportedAt).toISOString().slice(0, 10)}.json`
  const result = exportBackupToFile(json, name)
  if (result.ok) {
    showAppNotification(result.path ? `备份已保存：${result.path}` : '备份已开始下载')
  } else if (result.reason !== 'cancel') {
    showAppNotification('备份导出失败')
  }
}

function triggerImportBackup() {
  const result = importBackupFromFile()
  if (result.ok) {
    void restoreFromText(result.content)
    return
  }
  if (result.reason === 'fallback') {
    backupInputRef.value?.click()
  }
}

async function restoreFromText(text: string) {
  try {
    if (!window.confirm('从备份恢复将替换当前全部笔记与文件夹，并清除本地图片资源，是否继续？')) return
    await store.restoreLibraryBackup(text)
    showAppNotification('备份已恢复')
    emit('backup-restored')
  } catch (err) {
    showAppNotification(err instanceof Error ? err.message : '备份恢复失败')
  }
}

function onBackupFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => {
    const text = String(reader.result ?? '')
    await restoreFromText(text)
  }
  reader.readAsText(file)
}

async function clearAllLibraryData() {
  if (!window.confirm('将清空全部笔记、文件夹与图片资源，此操作不可恢复，是否继续？')) return
  if (!window.confirm('再次确认：确定要清空全部数据吗？')) return
  try {
    await store.clearAllLibraryData()
    await refreshStorageStats()
    showAppNotification('已清空全部数据')
    emit('library-cleared')
  } catch (err) {
    showAppNotification(err instanceof Error ? err.message : '清空数据失败')
  }
}
</script>

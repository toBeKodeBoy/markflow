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

      <div class="modal-actions">
        <button class="btn-primary" @click="confirm">保存</button>
        <button @click="emit('cancel')">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { AppSettings } from '../types'
import { clampFontSize, EDITOR_FONT_OPTIONS } from '../composables/useAppSettings'
import { useStorage } from '../composables/useStorage'

const props = defineProps<{ visible: boolean }>()

const emit = defineEmits<{
  confirm: [settings: AppSettings]
  cancel: []
}>()

const storage = useStorage()
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

function confirm() {
  emit('confirm', {
    ...storage.getSettings(),
    theme: draft.theme,
    fontSize: clampFontSize(draft.fontSize),
    editorFontFamily: draft.editorFontFamily,
  })
}
</script>

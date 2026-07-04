<template>
  <div v-if="visible" class="modal-overlay" @click.self="emit('cancel')">
    <div class="modal pdf-export-modal" role="dialog" aria-labelledby="pdf-export-title">
      <div id="pdf-export-title" class="modal-title">导出 PDF</div>

      <label class="pdf-option-row">
        <span class="pdf-option-label">纸张</span>
        <select v-model="draft.pageSize" class="pdf-option-select">
          <option v-for="item in PDF_PAGE_SIZES" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </label>

      <label class="pdf-option-row">
        <span class="pdf-option-label">页边距</span>
        <select v-model="draft.margin" class="pdf-option-select">
          <option v-for="item in PDF_MARGINS" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </label>

      <label class="pdf-option-row pdf-option-check">
        <input v-model="draft.printBackground" type="checkbox" />
        <span>打印背景色（代码块、表格底色等）</span>
      </label>

      <p v-if="isBrowserExport" class="pdf-export-tip">
        浏览器环境请在打印设置中关闭页眉页脚，避免出现网址与日期。
      </p>

      <div class="modal-actions">
        <button class="btn-primary" :disabled="exporting" @click="confirm">
          {{ exporting ? '导出中…' : '导出' }}
        </button>
        <button :disabled="exporting" @click="emit('cancel')">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { PdfExportOptions } from '../types'
import { PDF_MARGINS, PDF_PAGE_SIZES, loadPdfOptions, normalizePdfOptions } from '../utils/pdfOptions'

const props = defineProps<{
  visible: boolean
  exporting: boolean
}>()

/** 无 uTools printToPDF 时走浏览器 print，需提示关闭页眉页脚 */
const isBrowserExport = computed(
  () => typeof window.markflow === 'undefined' || !window.markflow.savePdfFromHtml
)

const emit = defineEmits<{
  confirm: [options: PdfExportOptions]
  cancel: []
}>()

const draft = reactive<PdfExportOptions>(loadPdfOptions())

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    const loaded = loadPdfOptions()
    draft.pageSize = loaded.pageSize
    draft.margin = loaded.margin
    draft.printBackground = loaded.printBackground
  }
)

function confirm() {
  emit('confirm', normalizePdfOptions(draft))
}
</script>

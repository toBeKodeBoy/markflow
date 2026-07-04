<template>
  <div class="preview-pane">
    <div class="preview-toolbar">
      <span class="preview-label">预览</span>
      <span v-if="previewLoading" class="preview-loading">渲染中…</span>
      <button @click="copyHtml" title="复制 HTML">复制HTML</button>
    </div>
    <div ref="previewContentEl" class="preview-content markdown-body" v-html="renderedHtml"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { parseMarkdown } from '../utils/markedSetup'
import { resolveMarkdownForDisplay } from '../utils/resolveMarkdownAssets'
import { handleCodeCopyCaptureClick } from '../utils/codeCopy'
import { handleImageLightboxDblClick } from '../utils/imageLightbox'
import { writeClipboard } from '../utils/clipboard'
import { useNoteStore } from '../stores/note'
import { useScrollSync } from '../composables/useScrollSync'
import { useTocJumpHandler } from '../composables/useTocJumpHandler'
import {
  LARGE_FILE_THRESHOLD,
  PREVIEW_RENDER_DEBOUNCE_MS,
  PREVIEW_LARGE_DEBOUNCE_MS
} from '../constants'

const store = useNoteStore()
const { scrollRatio } = useScrollSync()

const previewContentEl = ref<HTMLElement>()
const renderedHtml = ref('<p class="empty-preview">开始输入 Markdown...</p>')
const previewLoading = ref(false)
let renderTimer: ReturnType<typeof setTimeout> | null = null

/** 调度 Markdown 渲染：空内容显示占位，非空按文件大小选择防抖延迟 */
function scheduleRender(content: string) {
  if (renderTimer) clearTimeout(renderTimer)
  if (!content) {
    renderedHtml.value = '<p class="empty-preview">开始输入 Markdown...</p>'
    previewLoading.value = false
    return
  }
  previewLoading.value = true
  const delay = content.length > LARGE_FILE_THRESHOLD
    ? PREVIEW_LARGE_DEBOUNCE_MS
    : PREVIEW_RENDER_DEBOUNCE_MS
  renderTimer = setTimeout(() => {
    void resolveMarkdownForDisplay(content)
      .then((resolved) => {
        try {
          renderedHtml.value = parseMarkdown(resolved) || '<p class="empty-preview">预览渲染失败</p>'
        } catch {
          renderedHtml.value = '<p class="empty-preview">预览渲染失败</p>'
        }
      })
      .catch(() => {
        renderedHtml.value = '<p class="empty-preview">预览渲染失败</p>'
      })
      .finally(() => {
        previewLoading.value = false
      })
  }, delay)
}

watch(
  () => store.liveContent || (store.currentNote?.content ?? ''),
  (content) => scheduleRender(content),
  { immediate: true }
)

watch(scrollRatio, (ratio) => {
  const el = previewContentEl.value
  if (!el) return
  const max = el.scrollHeight - el.clientHeight
  if (max > 0) el.scrollTop = ratio * max
})

useTocJumpHandler(previewContentEl, store)

onMounted(() => {
  previewContentEl.value?.addEventListener('click', handleCodeCopyCaptureClick, true)
  previewContentEl.value?.addEventListener('dblclick', handleImageLightboxDblClick, true)
})

onBeforeUnmount(() => {
  if (renderTimer) clearTimeout(renderTimer)
  previewContentEl.value?.removeEventListener('click', handleCodeCopyCaptureClick, true)
  previewContentEl.value?.removeEventListener('dblclick', handleImageLightboxDblClick, true)
})

/** 复制当前渲染 HTML 到剪贴板 */
async function copyHtml() {
  const ok = await writeClipboard(renderedHtml.value)
  if (ok && typeof window.markflow !== 'undefined') {
    window.markflow.showNotification('HTML 已复制到剪贴板')
  }
}
</script>

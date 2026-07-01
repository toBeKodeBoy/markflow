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
import { handleCodeCopyCaptureClick } from '../utils/codeCopy'
import { writeClipboard } from '../utils/clipboard'
import { showCodeLanguageDropdown, hideCodeLanguageDropdown } from '../utils/codeLanguageDropdown'
import { updateFenceLanguage } from '../utils/updateFenceLanguage'
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
    try {
      renderedHtml.value = parseMarkdown(content) || '<p class="empty-preview">预览渲染失败</p>'
    } catch {
      renderedHtml.value = '<p class="empty-preview">预览渲染失败</p>'
    } finally {
      previewLoading.value = false
    }
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

function handleCodeLanguageMouseDown(e: MouseEvent) {
  const badge = (e.target as HTMLElement).closest?.('.preview-code-lang-badge') as HTMLElement | null
  if (!badge) return

  const index = Number(badge.dataset.codeBlockIndex)
  if (!Number.isInteger(index)) return

  e.preventDefault()
  e.stopPropagation()

  showCodeLanguageDropdown(badge, {
    onSelect: (lang) => {
      const content = store.liveContent || (store.currentNote?.content ?? '')
      const nextContent = updateFenceLanguage(content, index, lang)
      if (nextContent !== content) {
        store.updateCurrentContent(nextContent)
      }
    },
  })
}

onMounted(() => {
  previewContentEl.value?.addEventListener('mousedown', handleCodeLanguageMouseDown, true)
  previewContentEl.value?.addEventListener('click', handleCodeCopyCaptureClick, true)
})

onBeforeUnmount(() => {
  if (renderTimer) clearTimeout(renderTimer)
  hideCodeLanguageDropdown()
  previewContentEl.value?.removeEventListener('mousedown', handleCodeLanguageMouseDown, true)
  previewContentEl.value?.removeEventListener('click', handleCodeCopyCaptureClick, true)
})

/** 复制当前渲染 HTML 到剪贴板 */
async function copyHtml() {
  const ok = await writeClipboard(renderedHtml.value)
  if (ok && typeof window.markflow !== 'undefined') {
    window.markflow.showNotification('HTML 已复制到剪贴板')
  }
}
</script>

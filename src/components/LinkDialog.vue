<template>
  <div v-if="visible" class="modal-overlay" @click.self="emit('cancel')">
    <div class="modal link-dialog" role="dialog" aria-modal="true" aria-labelledby="link-dialog-title">
      <div id="link-dialog-title" class="modal-title">插入链接</div>

      <label class="settings-option-row">
        <span class="settings-option-label">链接文本</span>
        <input
          ref="textInputRef"
          v-model="localDraft.text"
          data-testid="link-dialog-text"
          type="text"
          class="modal-input"
          placeholder="请输入链接文本"
        >
      </label>

      <label class="settings-option-row">
        <span class="settings-option-label">URL</span>
        <input
          ref="urlInputRef"
          v-model="localDraft.url"
          data-testid="link-dialog-url"
          type="text"
          class="modal-input"
          placeholder="https://example.com"
        >
      </label>

      <label class="settings-option-row">
        <span class="settings-option-label">Title</span>
        <input
          v-model="localDraft.title"
          data-testid="link-dialog-title"
          type="text"
          class="modal-input"
          placeholder="可选"
        >
      </label>

      <div class="modal-actions">
        <button
          data-testid="link-dialog-confirm"
          class="btn-primary"
          type="button"
          @click="emit('confirm', { ...localDraft })"
        >
          确认
        </button>
        <button data-testid="link-dialog-cancel" type="button" @click="emit('cancel')">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, reactive, ref, watch } from 'vue'
import type { LinkDraft } from '../utils/linkEditing'

const props = defineProps<{
  visible: boolean
  draft: LinkDraft
}>()

const emit = defineEmits<{
  confirm: [draft: LinkDraft]
  cancel: []
}>()

const textInputRef = ref<HTMLInputElement | null>(null)
const urlInputRef = ref<HTMLInputElement | null>(null)
const localDraft = reactive<LinkDraft>({
  text: '',
  url: '',
  title: '',
})

function syncDraft() {
  localDraft.text = props.draft.text
  localDraft.url = props.draft.url
  localDraft.title = props.draft.title
}

watch(
  () => props.draft,
  () => {
    syncDraft()
  },
  { deep: true, immediate: true },
)

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    syncDraft()
    await nextTick()
    if (localDraft.url) {
      textInputRef.value?.focus()
      textInputRef.value?.select()
      return
    }
    urlInputRef.value?.focus()
  },
  { immediate: true },
)
</script>

<template>
  <div
    v-if="visible"
    class="modal-overlay"
    data-testid="highlight-text-modal"
    @click.self="emit('cancel')"
  >
    <div class="modal highlight-text-modal" role="dialog" aria-modal="true" aria-labelledby="highlight-text-title">
      <div id="highlight-text-title" class="modal-title">插入高亮文本</div>

      <label class="settings-option-row">
        <span class="settings-option-label">文本</span>
        <input
          ref="inputRef"
          v-model="localText"
          data-testid="highlight-text-input"
          type="text"
          class="modal-input"
          placeholder="请输入需要高亮的文字"
          @keydown.enter.prevent="confirm"
          @keydown.escape.prevent="emit('cancel')"
        >
      </label>

      <div class="modal-actions">
        <button
          type="button"
          class="btn-primary"
          data-testid="highlight-text-confirm"
          :disabled="!canConfirm"
          @click="confirm"
        >
          确认
        </button>
        <button type="button" data-testid="highlight-text-cancel" @click="emit('cancel')">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  initialText?: string
}>()

const emit = defineEmits<{
  confirm: [text: string]
  cancel: []
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const localText = ref('')
const canConfirm = computed(() => localText.value.trim().length > 0)

function syncText() {
  localText.value = props.initialText ?? ''
}

function confirm() {
  const text = localText.value.trim()
  if (!text) return
  emit('confirm', text)
}

watch(
  () => props.initialText,
  () => {
    syncText()
  },
  { immediate: true },
)

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    syncText()
    await nextTick()
    inputRef.value?.focus()
    inputRef.value?.select()
  },
  { immediate: true },
)
</script>

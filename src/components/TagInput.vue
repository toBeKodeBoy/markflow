<template>
  <div class="tag-input" @click="focusInput">
    <span v-for="tag in modelValue" :key="tag" class="tag-pill">
      {{ tag }}
      <button
        type="button"
        class="tag-remove"
        data-testid="tag-remove"
        :aria-label="`删除标签 ${tag}`"
        @click.stop="removeTag(tag)"
      >×</button>
    </span>
    <input
      ref="inputRef"
      v-model="draft"
      class="tag-input-field"
      type="text"
      placeholder="添加标签…"
      @keydown="onKeydown"
      @keydown.backspace="onBackspace"
      @focus="suggestOpen = true"
      @blur="onBlur"
      @input="suggestOpen = true"
    />
    <ul v-if="suggestOpen && filteredSuggestions.length" class="tag-suggestions" role="listbox">
      <li
        v-for="item in filteredSuggestions"
        :key="item"
        role="option"
        data-testid="tag-suggestion"
        @mousedown.prevent="pickSuggestion(item)"
      >{{ item }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { normalizeTagInput } from '../utils/tagNormalize'

const props = defineProps<{
  modelValue: string[]
  suggestions?: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [tags: string[]]
}>()

const inputRef = ref<HTMLInputElement>()
const draft = ref('')
const suggestOpen = ref(false)

const filteredSuggestions = computed(() => {
  const current = new Set(props.modelValue.map((t) => t.toLowerCase()))
  const q = draft.value.trim().toLowerCase()
  return (props.suggestions ?? [])
    .filter((t) => !current.has(t.toLowerCase()))
    .filter((t) => !q || t.toLowerCase().includes(q))
    .slice(0, 8)
})

function focusInput() {
  inputRef.value?.focus()
}

function emitTags(tags: string[]) {
  emit('update:modelValue', tags)
}

function removeTag(tag: string) {
  const key = tag.toLowerCase()
  emitTags(props.modelValue.filter((t) => t.toLowerCase() !== key))
}

function commitDraft() {
  const normalized = normalizeTagInput(draft.value)
  if (!normalized) {
    draft.value = ''
    return
  }
  const exists = props.modelValue.some((t) => t.toLowerCase() === normalized.toLowerCase())
  if (!exists) emitTags([...props.modelValue, normalized])
  draft.value = ''
  suggestOpen.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    commitDraft()
    return
  }
  if (e.key === ',') {
    e.preventDefault()
    commitDraft()
  }
}

function pickSuggestion(tag: string) {
  draft.value = tag
  commitDraft()
}

function onBackspace(e: KeyboardEvent) {
  if (draft.value || props.modelValue.length === 0) return
  e.preventDefault()
  emitTags(props.modelValue.slice(0, -1))
}

function onBlur() {
  window.setTimeout(() => {
    suggestOpen.value = false
  }, 120)
}
</script>

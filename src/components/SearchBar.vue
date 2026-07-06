<template>
  <div class="search-bar">
    <div class="search-bar-field" :class="{ focused: isFocused }">
      <AppIcon name="search" :size="16" class="search-bar-icon" />
      <input
        ref="inputRef"
        v-model="localQuery"
        type="text"
        placeholder="搜索标题、正文或标签..."
        class="search-bar-input"
        aria-label="搜索笔记"
        @focus="isFocused = true"
        @blur="isFocused = false"
        @keydown.esc.prevent="onEscape"
      />
      <button
        v-if="localQuery"
        type="button"
        class="search-bar-clear"
        aria-label="清除搜索"
        @mousedown.prevent
        @click="clearSearch"
      >
        <AppIcon name="close" :size="14" />
      </button>
    </div>
    <p v-if="showCount" class="search-bar-count">
      找到 {{ resultCount }} 篇笔记
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useNoteStore } from '../stores/note'
import { useDebouncedSearch } from '../composables/useDebouncedSearch'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  resultCount?: number
  showCount?: boolean
}>()

const store = useNoteStore()
const inputRef = ref<HTMLInputElement>()
const isFocused = ref(false)

const { localQuery, clearSearch, syncQuery } = useDebouncedSearch((query) => {
  store.searchQuery = query
})

const showCount = computed(() => props.showCount && (props.resultCount ?? 0) >= 0)

watch(
  () => store.searchQuery,
  (query) => {
    if (query !== localQuery.value) syncQuery(query)
  }
)

function onEscape() {
  clearSearch()
  inputRef.value?.blur()
}

defineExpose({ clearSearch, focus: () => inputRef.value?.focus() })
</script>

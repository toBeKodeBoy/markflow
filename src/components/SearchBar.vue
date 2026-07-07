<template>
  <div class="sidebar-search">
    <input
      v-model="draft"
      type="search"
      placeholder="搜索标题、正文或标签..."
      class="search-input"
      aria-label="搜索笔记"
      @keydown.escape="clearSearch"
    />
    <span v-if="showCount && draft.trim()" class="search-result-count">{{ resultCount }} 条</span>
  </div>
</template>

<script setup lang="ts">
import { useNoteStore } from '../stores/note'
import { storeToRefs } from 'pinia'
import { useDebouncedSearch } from '../composables/useDebouncedSearch'

defineProps<{
  showCount?: boolean
  resultCount?: number
}>()

const store = useNoteStore()
const { searchQuery } = storeToRefs(store)
const { draft, flush } = useDebouncedSearch(searchQuery)

function clearSearch() {
  draft.value = ''
  flush()
}

defineExpose({ clearSearch, draft })
</script>

<template>
  <div v-if="visible" class="search-modal-overlay" @click.self="emit('close')">
    <div class="search-modal" role="dialog" aria-modal="true" aria-label="搜索笔记">
      <div class="search-modal-header">
        <span class="search-modal-icon">🔍</span>
        <input
          ref="inputRef"
          v-model="draft"
          type="text"
          class="search-modal-input"
          placeholder="搜索笔记标题或标签..."
          aria-label="搜索笔记"
          :aria-expanded="draft.trim() ? results.length > 0 : undefined"
          :aria-activedescendant="results.length > 0 ? `search-option-${results[selectedIndex]?.note.id}` : undefined"
          aria-autocomplete="list"
          aria-controls="search-results-list"
          @keydown.escape="emit('close')"
          @keydown.arrow-down.prevent="moveSelection(1)"
          @keydown.arrow-up.prevent="moveSelection(-1)"
          @keydown.enter.prevent="confirmSelection"
          @keydown.tab.prevent="trapFocus"
        />
        <kbd class="search-modal-kbd">Ctrl+K</kbd>
      </div>

      <div v-if="draft.trim() && results.length === 0" class="search-modal-empty">
        未找到匹配笔记「{{ draft.trim() }}」
      </div>

      <div
        v-if="results.length > 0"
        id="search-results-list"
        class="search-modal-results"
        role="listbox"
        aria-label="搜索结果"
      >
        <button
          v-for="(item, i) in results"
          :key="item.note.id"
          :id="`search-option-${item.note.id}`"
          :class="['search-modal-item', { active: i === selectedIndex }]"
          role="option"
          :aria-selected="i === selectedIndex"
          @click="selectNote(item.note.id)"
          @mouseenter="selectedIndex = i"
        >
          <span class="search-modal-item-title">{{ item.note.title }}</span>
          <span v-if="item.note.tags?.length" class="search-modal-item-tags">
            <span v-for="tag in item.note.tags" :key="tag" class="search-modal-item-tag">{{ tag }}</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useNoteStore } from '../stores/note'
import { storeToRefs } from 'pinia'
import { fuzzyMatch } from '../utils/searchSnippet'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: []; select: [noteId: string] }>()

const store = useNoteStore()
const { noteList } = storeToRefs(store)

const inputRef = ref<HTMLInputElement>()
const draft = ref('')
const selectedIndex = ref(0)

interface SearchResult {
  note: { id: string; title: string; tags?: string[]; updatedAt: number }
  score: number
}

const results = computed<SearchResult[]>(() => {
  const q = draft.value.trim()
  if (!q) return []

  const scored: SearchResult[] = []
  for (const note of noteList.value) {
    const titleMatch = fuzzyMatch(note.title, q)

    let tagScore = 0
    let tagMatched = false
    for (const tag of note.tags ?? []) {
      const tm = fuzzyMatch(tag, q)
      if (tm.matched) {
        tagScore = Math.max(tagScore, tm.score)
        tagMatched = true
      }
    }

    const bestScore = titleMatch.matched
      ? titleMatch.score * 2 + tagScore * 0.5
      : tagScore * 1.5
    if (titleMatch.matched || tagMatched) {
      scored.push({ note, score: bestScore })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored
})

watch(
  () => props.visible,
  (v) => {
    if (v) {
      draft.value = ''
      selectedIndex.value = 0
      nextTick(() => inputRef.value?.focus())
    }
  }
)

watch(draft, () => {
  selectedIndex.value = 0
})

function moveSelection(delta: number) {
  if (results.value.length === 0) return
  selectedIndex.value = (selectedIndex.value + delta + results.value.length) % results.value.length
}

function trapFocus() {
  inputRef.value?.focus()
}

function confirmSelection() {
  if (results.value.length === 0) return
  const item = results.value[selectedIndex.value]
  selectNote(item.note.id)
}

function selectNote(noteId: string) {
  emit('select', noteId)
  emit('close')
}
</script>

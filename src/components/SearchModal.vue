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
          placeholder="搜索笔记标题、正文或标签..."
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
          <span v-if="item.matchKind === 'body' && item.snippet" class="search-modal-item-snippet">
            <template v-for="(seg, si) in item.snippet" :key="si">
              <mark v-if="seg.highlight" class="search-modal-highlight">{{ seg.text }}</mark>
              <template v-else>{{ seg.text }}</template>
            </template>
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
import { fuzzyMatch, buildSearchSnippet, type SnippetSegment } from '../utils/searchSnippet'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: []; select: [noteId: string] }>()

const store = useNoteStore()
const { noteList, contentSearchIndex } = storeToRefs(store)

const inputRef = ref<HTMLInputElement>()
const draft = ref('')
const selectedIndex = ref(0)

interface SearchResult {
  note: { id: string; title: string; tags?: string[]; updatedAt: number }
  score: number
  matchKind: 'title' | 'tag' | 'body'
  snippet: SnippetSegment[]
}

const results = computed<SearchResult[]>(() => {
  const q = draft.value.trim()
  if (!q) return []

  const qLower = q.toLowerCase()
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

    const indexedContent = contentSearchIndex.value[note.id] ?? ''
    let bodyMatched = false
    let bodyScore = 0
    let snippet: SnippetSegment[] = []

    if (indexedContent.includes(qLower)) {
      bodyMatched = true
      const rawContent = store.getNoteContentById(note.id)
      snippet = buildSearchSnippet(rawContent, q)
      bodyScore = 8 + q.length
    }

    let matchKind: 'title' | 'tag' | 'body' = 'title'
    let bestScore = 0

    if (titleMatch.matched) {
      bestScore = titleMatch.score * 2
      matchKind = 'title'
    }
    if (tagMatched && tagScore * 0.8 > bestScore) {
      bestScore = tagScore * 0.8
      matchKind = 'tag'
    }
    if (bodyMatched && bodyScore > bestScore) {
      bestScore = bodyScore
      matchKind = 'body'
    }

    if (titleMatch.matched || tagMatched || bodyMatched) {
      scored.push({ note, score: bestScore, matchKind, snippet })
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
  const item = results.value[selectedIndex.value]
  if (!item) return
  selectNote(item.note.id)
}

function selectNote(noteId: string) {
  emit('select', noteId)
  emit('close')
}
</script>

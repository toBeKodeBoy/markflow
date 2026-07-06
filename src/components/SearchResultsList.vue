<template>
  <div ref="listRef" class="search-results-list" @scroll="onScroll">
    <p v-if="folderScopeLabel" class="search-results-scope">
      <AppIcon name="folder" :size="12" />
      当前范围：{{ folderScopeLabel }}
    </p>

    <SearchEmptyState
      v-if="notes.length === 0"
      :query="query"
      :active-tag-filter="activeTagFilter"
      @clear="$emit('clear')"
    />

    <div
      v-else-if="useVirtual"
      class="search-results-virtual"
      :style="{ height: listHeight + 'px' }"
    >
      <SearchResultItem
        v-for="(note, i) in visibleNotes"
        :key="note.id"
        :note="note"
        :query="query"
        :content="contentById[note.id] ?? ''"
        :active="currentNoteId === note.id"
        :folder-path="folderPath(note.folderId)"
        virtual
        :virtual-style="{ top: (virtualStart + i) * ROW_HEIGHT + 'px' }"
        @select="$emit('select', $event)"
      />
    </div>

    <template v-else>
      <SearchResultItem
        v-for="note in notes"
        :key="note.id"
        :note="note"
        :query="query"
        :content="contentById[note.id] ?? ''"
        :active="currentNoteId === note.id"
        :folder-path="folderPath(note.folderId)"
        @select="$emit('select', $event)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { NoteListItem, Folder } from '../types'
import { getFolderPathLabel } from '../utils/folderTree'
import AppIcon from './AppIcon.vue'
import SearchResultItem from './SearchResultItem.vue'
import SearchEmptyState from './SearchEmptyState.vue'

const ROW_HEIGHT = 72
const VIRTUAL_THRESHOLD = 80
const VIRTUAL_BUFFER = 6

const props = defineProps<{
  notes: NoteListItem[]
  query: string
  folders: Folder[]
  currentNoteId?: string
  activeTagFilter?: string | null
  folderScopeLabel?: string
  liveContent?: string
  getContent: (id: string) => string
}>()

defineEmits<{ select: [noteId: string]; clear: [] }>()

const listRef = ref<HTMLElement>()
const scrollTop = ref(0)

const contentById = computed(() => {
  const map: Record<string, string> = {}
  for (const note of props.notes) {
    if (note.id === props.currentNoteId && props.liveContent !== undefined) {
      map[note.id] = props.liveContent
    } else {
      map[note.id] = props.getContent(note.id)
    }
  }
  return map
})

const useVirtual = computed(() => props.notes.length > VIRTUAL_THRESHOLD)
const listHeight = computed(() => props.notes.length * ROW_HEIGHT)

const virtualStart = computed(() => {
  if (!useVirtual.value) return 0
  return Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - VIRTUAL_BUFFER)
})

const virtualEnd = computed(() => {
  if (!useVirtual.value) return props.notes.length
  const containerH = listRef.value?.clientHeight ?? 400
  const count = Math.ceil(containerH / ROW_HEIGHT) + VIRTUAL_BUFFER * 2
  return Math.min(props.notes.length, virtualStart.value + count)
})

const visibleNotes = computed(() => props.notes.slice(virtualStart.value, virtualEnd.value))

function resetScroll() {
  scrollTop.value = 0
  nextTick(() => listRef.value?.scrollTo({ top: 0 }))
}

watch(() => props.query, resetScroll)
watch(() => props.notes.length, resetScroll)

function onScroll(e: Event) {
  scrollTop.value = (e.target as HTMLElement).scrollTop
}

function folderPath(folderId?: string) {
  if (!folderId) return ''
  return getFolderPathLabel(props.folders, folderId)
}
</script>

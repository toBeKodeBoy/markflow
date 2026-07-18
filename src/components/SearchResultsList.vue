<template>
  <div class="search-results-list">
    <p v-if="folderScopeLabel" class="search-scope-hint">{{ folderScopeLabel }}</p>
    <SearchEmptyState
      v-if="notes.length === 0"
      :query="query"
      @clear="$emit('clear')"
    />
    <SearchResultItem
      v-for="note in notes"
      :key="note.id"
      :note="note"
      :query="query"
      :folders="folders"
      :current-note-id="currentNoteId"
      :content="resolveContent(note.id)"
      :renaming-note-id="renamingNoteId"
      :renaming-note-name="renamingNoteName"
      @select="$emit('select', $event)"
      @update:renaming-note-name="$emit('update:renamingNoteName', $event)"
      @start-rename-note="$emit('start-rename-note', $event)"
      @commit-rename-note="$emit('commit-rename-note')"
      @cancel-rename-note="$emit('cancel-rename-note')"
    />
  </div>
</template>

<script setup lang="ts">
import type { Folder, NoteListItem } from '../types'
import SearchResultItem from './SearchResultItem.vue'
import SearchEmptyState from './SearchEmptyState.vue'

const props = defineProps<{
  notes: NoteListItem[]
  query: string
  folders: Folder[]
  currentNoteId?: string
  folderScopeLabel?: string
  getContent: (id: string) => string
  renamingNoteId: string | null
  renamingNoteName: string
}>()

defineEmits<{
  select: [id: string]
  clear: []
  'update:renamingNoteName': [value: string]
  'start-rename-note': [id: string]
  'commit-rename-note': []
  'cancel-rename-note': []
}>()

function resolveContent(id: string) {
  return props.getContent(id)
}
</script>

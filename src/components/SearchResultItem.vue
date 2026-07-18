<template>
  <div
    class="search-result-item"
    :class="{ active: currentNoteId === note.id }"
    role="button"
    tabindex="0"
    @click="onSelect"
    @keydown="onKeydown"
    @dblclick.stop="$emit('start-rename-note', note.id)"
  >
    <div class="search-result-title">
      <span v-if="note.pinned" class="note-pin-icon" title="已置顶">📌</span>
      <input
        v-if="renamingNoteId === note.id"
        :value="renamingNoteName"
        class="rename-input search-result-rename-input"
        autofocus
        @input="$emit('update:renamingNoteName', ($event.target as HTMLInputElement).value)"
        @keyup.enter="$emit('commit-rename-note')"
        @keyup.escape="$emit('cancel-rename-note')"
        @blur="$emit('commit-rename-note')"
        @click.stop
      />
      <template v-else>
        <template v-for="(seg, i) in titleSegments" :key="'t' + i">
          <mark v-if="seg.highlight" class="search-highlight">{{ seg.text }}</mark>
          <span v-else>{{ seg.text }}</span>
        </template>
      </template>
    </div>
    <div v-if="folderLabel" class="search-result-folder">{{ folderLabel }}</div>
    <div v-if="match.kind === 'tag'" class="search-result-snippet search-result-tag">
      标签：
      <template v-for="(seg, i) in match.segments" :key="'g' + i">
        <mark v-if="seg.highlight" class="search-highlight">{{ seg.text }}</mark>
        <span v-else>{{ seg.text }}</span>
      </template>
    </div>
    <div v-else-if="match.kind === 'body'" class="search-result-snippet">
      <template v-for="(seg, i) in match.segments" :key="'s' + i">
        <mark v-if="seg.highlight" class="search-highlight">{{ seg.text }}</mark>
        <span v-else>{{ seg.text }}</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Folder, NoteListItem } from '../types'
import { getSearchMatchInfo } from '../utils/searchSnippet'
import { getFolderPathLabel } from '../utils/folderTree'

const props = defineProps<{
  note: NoteListItem
  query: string
  folders: Folder[]
  currentNoteId?: string
  content: string
  renamingNoteId: string | null
  renamingNoteName: string
}>()

const emit = defineEmits<{
  select: [id: string]
  'update:renamingNoteName': [value: string]
  'start-rename-note': [id: string]
  'commit-rename-note': []
  'cancel-rename-note': []
}>()

const match = computed(() => getSearchMatchInfo(props.note, props.query, props.content))

const titleSegments = computed(() => {
  if (match.value.kind === 'title') return match.value.segments
  return [{ text: props.note.title, highlight: false }]
})

const folderLabel = computed(() => {
  if (!props.note.folderId) return ''
  return getFolderPathLabel(props.folders, props.note.folderId)
})

function onSelect() {
  if (props.renamingNoteId === props.note.id) return
  emit('select', props.note.id)
}

function onKeydown(e: KeyboardEvent) {
  if (props.renamingNoteId === props.note.id) return
  if (e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault()
  emit('select', props.note.id)
}
</script>

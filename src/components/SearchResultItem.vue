<template>
  <button
    type="button"
    class="search-result-item"
    :class="{ active: currentNoteId === note.id }"
    @click="$emit('select', note.id)"
  >
    <div class="search-result-title">
      <span v-if="note.pinned" class="note-pin-icon" title="已置顶">📌</span>
      <template v-for="(seg, i) in titleSegments" :key="'t' + i">
        <mark v-if="seg.highlight" class="search-highlight">{{ seg.text }}</mark>
        <span v-else>{{ seg.text }}</span>
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
  </button>
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
}>()

defineEmits<{ select: [id: string] }>()

const match = computed(() => getSearchMatchInfo(props.note, props.query, props.content))

const titleSegments = computed(() => {
  if (match.value.kind === 'title') return match.value.segments
  return [{ text: props.note.title, highlight: false }]
})

const folderLabel = computed(() => {
  if (!props.note.folderId) return ''
  return getFolderPathLabel(props.folders, props.note.folderId)
})
</script>

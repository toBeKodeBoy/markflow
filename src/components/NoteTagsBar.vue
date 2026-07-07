<template>
  <TagInput
    v-if="store.currentNote"
    class="note-tags-bar"
    :model-value="store.currentNote.tags ?? []"
    :suggestions="store.allTags"
    @update:model-value="onTagsChange"
  />
</template>

<script setup lang="ts">
import { useNoteStore } from '../stores/note'
import { showAppNotification } from '../utils/notify'
import TagInput from './TagInput.vue'

const store = useNoteStore()

function onTagsChange(tags: string[]) {
  const id = store.currentNote?.id
  if (!id) return
  if (!store.setNoteTags(id, tags)) {
    showAppNotification('标签无效或未保存（最长 20 字符）')
  }
}
</script>

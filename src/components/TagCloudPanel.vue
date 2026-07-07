<template>
  <div v-if="tags.length" class="tag-cloud-panel">
    <button
      type="button"
      class="tag-cloud-panel-header"
      :aria-expanded="!collapsed"
      @click="$emit('toggle-collapse')"
    >
      <span class="tag-cloud-panel-chevron" :class="{ collapsed }">▾</span>
      <span class="tag-cloud-panel-title">标签云</span>
      <span class="tag-cloud-panel-count">{{ tags.length }} 个</span>
    </button>
    <TagCloud
      v-show="!collapsed"
      :tags="tags"
      :active-tag="activeTag"
      @select="$emit('select', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { TagStat } from '../types'
import TagCloud from './TagCloud.vue'

defineProps<{
  tags: TagStat[]
  activeTag: string | null
  collapsed: boolean
}>()

defineEmits<{
  select: [tag: string]
  'toggle-collapse': []
}>()
</script>

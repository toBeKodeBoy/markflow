<template>
  <div class="tag-cloud" :style="cloudStyle" role="group" aria-label="标签云">
    <button
      v-for="item in tags"
      :key="item.tag"
      type="button"
      class="tag-cloud-item"
      :class="{ active: isActive(item.tag) }"
      :style="itemStyle(item.weight)"
      :title="`${item.tag} · ${item.count} 篇笔记`"
      :aria-pressed="isActive(item.tag)"
      @click="$emit('select', item.tag)"
    >{{ item.tag }}</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TagStat } from '../types'
import { tagCloudItemStyle } from '../composables/useTagCloudLayout'

const props = defineProps<{
  tags: TagStat[]
  activeTag: string | null
  maxHeight?: number
}>()

defineEmits<{ select: [tag: string] }>()

const cloudStyle = computed(() => ({
  maxHeight: props.maxHeight != null ? `${props.maxHeight}px` : '120px',
}))

function isActive(tag: string): boolean {
  if (!props.activeTag) return false
  return tag.toLowerCase() === props.activeTag.toLowerCase()
}

function itemStyle(weight: number) {
  const s = tagCloudItemStyle(weight)
  return {
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    opacity: s.opacity,
  }
}
</script>

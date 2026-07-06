<template>
  <div
    class="search-result-item"
    :class="{ active }"
    :style="rowStyle"
    @click="$emit('select', note.id)"
  >
    <div class="search-result-title-row">
      <span v-if="note.pinned" class="note-pin-icon" title="已置顶">📌</span>
      <div class="search-result-title">
        <template v-for="(seg, i) in titleSegments" :key="'t' + i">
          <mark v-if="seg.highlight">{{ seg.text }}</mark>
          <span v-else>{{ seg.text }}</span>
        </template>
      </div>
    </div>

    <div v-if="snippetSegments?.length" class="search-result-snippet">
      <template v-for="(seg, i) in snippetSegments" :key="'s' + i">
        <mark v-if="seg.highlight">{{ seg.text }}</mark>
        <span v-else>{{ seg.text }}</span>
      </template>
    </div>
    <div v-else-if="matchInfo.kinds.includes('title')" class="search-result-snippet muted">
      匹配标题
    </div>

    <div class="search-result-meta">
      <span v-if="folderPath" class="search-result-meta-item">
        <AppIcon name="folder" :size="11" />
        {{ folderPath }}
      </span>
      <span v-if="matchInfo.matchedTag" class="search-result-tag">{{ matchInfo.matchedTag }}</span>
      <span v-for="kind in kindLabels" :key="kind" class="search-result-badge">{{ kind }}</span>
      <span class="search-result-meta-time">{{ formattedDate }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import type { NoteListItem } from '../types'
import { splitHighlightSegments, getSearchMatchInfo } from '../utils/searchSnippet'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  note: NoteListItem
  query: string
  content: string
  active?: boolean
  folderPath?: string
  virtualStyle?: Record<string, string>
}>()

defineEmits<{ select: [noteId: string] }>()

const matchInfo = computed(() => getSearchMatchInfo(props.note, props.query, props.content))
const titleSegments = computed(() => splitHighlightSegments(props.note.title, props.query.trim()))
const snippetSegments = computed(() => matchInfo.value.snippet)

const kindLabels = computed(() => {
  const map = { title: '标题', body: '正文', tag: '标签' } as const
  return matchInfo.value.kinds.map((k) => map[k])
})

const formattedDate = computed(() => {
  const d = new Date(props.note.updatedAt)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('zh', { hour: '2-digit', minute: '2-digit' })
  if (diffDays < 7) return `${diffDays}天前`
  return d.toLocaleDateString('zh', { month: 'short', day: 'numeric' })
})

const rowStyle = computed((): CSSProperties | undefined => {
  if (!props.virtualStyle) return undefined
  return { ...props.virtualStyle, position: 'absolute', left: '0', right: '0' }
})
</script>

<template>
  <div class="toc-pane">
    <div class="toc-title">
      目录
      <span v-if="headings.length > 0" class="toc-count">{{ headings.length }}</span>
    </div>
    <div v-if="headings.length === 0" class="toc-empty">暂无标题</div>
    <div v-else ref="listRef" class="toc-list" @scroll="onListScroll">
      <div
        v-if="useVirtual"
        class="toc-virtual"
        :style="{ height: listHeight + 'px' }"
      >
        <button
          v-for="item in visibleHeadings"
          :key="item.line"
          class="toc-item toc-item-virtual"
          :data-level="item.level"
          :title="item.text"
          :style="{ top: item.offset + 'px' }"
          @click="jumpTo(item)"
        >{{ item.text }}</button>
      </div>
      <template v-else>
        <button
          v-for="item in headings"
          :key="item.line"
          class="toc-item"
          :data-level="item.level"
          :title="item.text"
          @click="jumpTo(item)"
        >{{ item.text }}</button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNoteStore } from '../stores/note'
import { useTocHeadings, type TocHeading } from '../composables/useTocHeadings'

const store = useNoteStore()
const headings = useTocHeadings()

const ITEM_HEIGHT = 30
const VIRTUAL_THRESHOLD = 150
const BUFFER = 10

const listRef = ref<HTMLElement>()
const scrollTop = ref(0)

const useVirtual = computed(() => headings.value.length > VIRTUAL_THRESHOLD)
const listHeight = computed(() => headings.value.length * ITEM_HEIGHT)

const visibleHeadings = computed(() => {
  if (!useVirtual.value) return []
  const containerH = listRef.value?.clientHeight ?? 400
  const start = Math.max(0, Math.floor(scrollTop.value / ITEM_HEIGHT) - BUFFER)
  const count = Math.ceil(containerH / ITEM_HEIGHT) + BUFFER * 2
  const end = Math.min(headings.value.length, start + count)
  return headings.value.slice(start, end).map((item, i) => ({
    ...item,
    offset: (start + i) * ITEM_HEIGHT
  }))
})

function onListScroll(e: Event) {
  scrollTop.value = (e.target as HTMLElement).scrollTop
}

function jumpTo(item: TocHeading) {
  store.requestTocJump(item.line, item.index)
}
</script>

<template>
  <div class="toc-pane">
    <div class="toc-title">
      <span class="toc-title-text">
        目录
        <span v-if="headings.length > 0" class="toc-count">{{ headings.length }}</span>
      </span>
      <button
        class="toc-insert-btn"
        type="button"
        title="插入目录到文档"
        :disabled="headings.length === 0"
        @click="insertToc"
      >插入目录</button>
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
          :class="{ active: item.index === activeHeadingIndex }"
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
          :class="{ active: item.index === activeHeadingIndex }"
          :data-level="item.level"
          :title="item.text"
          @click="jumpTo(item)"
        >{{ item.text }}</button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef } from 'vue'
import { useNoteStore } from '../stores/note'
import { useTocHeadings, type TocHeading } from '../composables/useTocHeadings'
import { useTocScrollSpy } from '../composables/useTocScrollSpy'
import { showAppNotification } from '../utils/notify'
import type { ViewMode } from '../types'

const props = defineProps<{ viewMode: ViewMode }>()

const store = useNoteStore()
const headings = useTocHeadings()
const { activeHeadingIndex } = useTocScrollSpy(toRef(props, 'viewMode'))

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

/** 目录列表滚动时记录 scrollTop 以计算虚拟列表可见范围 */
function onListScroll(e: Event) {
  scrollTop.value = (e.target as HTMLElement).scrollTop
}

/** 点击标题跳转到编辑器中对应位置 */
function jumpTo(item: TocHeading) {
  store.requestTocJump(item.line, item.index)
}

/** 将 Markdown 目录块插入文档 */
function insertToc() {
  if (store.insertAutoToc()) {
    showAppNotification('已插入目录')
  } else {
    showAppNotification('当前文档没有可生成的标题')
  }
}
</script>

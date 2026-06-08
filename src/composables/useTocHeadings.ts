import { shallowRef, watch, onMounted, onBeforeUnmount } from 'vue'
import { useNoteStore } from '../stores/note'
import { TOC_PARSE_DEBOUNCE_MS } from '../constants'

export interface TocHeading {
  level: number
  text: string
  line: number
  index: number
}

/** Single-pass heading parse — avoids split('\\n') on very large files. */
export function parseHeadings(content: string): TocHeading[] {
  const result: TocHeading[] = []
  let line = 0
  let start = 0
  while (start <= content.length) {
    const end = content.indexOf('\n', start)
    const lineEnd = end === -1 ? content.length : end
    const chunk = content.slice(start, lineEnd)
    const m = chunk.match(/^(#{1,6})\s+(.+)/)
    if (m) {
      result.push({ level: m[1].length, text: m[2].trim(), line, index: result.length })
    }
    line++
    if (end === -1) break
    start = end + 1
  }
  return result
}

/** 标题解析 composable：监听内容变更，按 TOC 显隐生命周期调度解析 */
export function useTocHeadings() {
  const store = useNoteStore()
  const headings = shallowRef<TocHeading[]>([])
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  /** 立即解析标题并更新响应式 headings */
  function parseNow(content: string) {
    if (!store.tocVisible) return
    headings.value = parseHeadings(content)
  }

  /** 调度标题解析：immediate 为 true 时同步执行，否则防抖后执行 */
  function scheduleParse(content: string, immediate = false) {
    if (!store.tocVisible) return
    if (debounceTimer) clearTimeout(debounceTimer)
    if (immediate) {
      parseNow(content)
      return
    }
    debounceTimer = setTimeout(() => parseNow(content), TOC_PARSE_DEBOUNCE_MS)
  }

  /** 从 store 读取 liveContent 并触发标题解析 */
  function refreshHeadings(immediate = false) {
    if (!store.tocVisible) return
    const content = store.liveContent || store.currentNote?.content || ''
    scheduleParse(content, immediate)
  }

  // Toc mounts via v-if after tocVisible is already true — watcher alone misses the first open.
  onMounted(() => refreshHeadings(true))

  watch(
    () => store.currentNote?.id,
    () => refreshHeadings(true)
  )

  watch(
    () => store.liveContent || store.currentNote?.content || '',
    (content) => scheduleParse(content, false)
  )

  watch(
    () => store.tocVisible,
    (visible) => {
      if (visible) refreshHeadings(true)
    }
  )

  onBeforeUnmount(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
  })

  return headings
}

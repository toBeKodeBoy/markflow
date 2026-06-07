import { shallowRef, watch, onBeforeUnmount } from 'vue'
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

export function useTocHeadings() {
  const store = useNoteStore()
  const headings = shallowRef<TocHeading[]>([])
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function parseNow(content: string) {
    if (!store.tocVisible) return
    headings.value = parseHeadings(content)
  }

  function scheduleParse(content: string, immediate = false) {
    if (!store.tocVisible) return
    if (debounceTimer) clearTimeout(debounceTimer)
    if (immediate) {
      parseNow(content)
      return
    }
    debounceTimer = setTimeout(() => parseNow(content), TOC_PARSE_DEBOUNCE_MS)
  }

  watch(
    () => store.currentNote?.id,
    () => {
      const content = store.liveContent || store.currentNote?.content || ''
      scheduleParse(content, true)
    }
  )

  watch(
    () => store.liveContent || store.currentNote?.content || '',
    (content) => scheduleParse(content, false)
  )

  watch(
    () => store.tocVisible,
    (visible) => {
      if (!visible) return
      const content = store.liveContent || store.currentNote?.content || ''
      scheduleParse(content, true)
    }
  )

  onBeforeUnmount(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
  })

  return headings
}

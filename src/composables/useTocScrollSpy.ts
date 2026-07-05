import { ref, onMounted, onBeforeUnmount, watch, type Ref } from 'vue'
import { useNoteStore } from '../stores/note'
import type { ViewMode } from '../types'

const HEADING_SELECTOR = 'h1,h2,h3,h4,h5,h6'

function resolveScrollTarget(viewMode: ViewMode): {
  scrollEl: HTMLElement | null
  headingRoot: ParentNode | null
} {
  if (viewMode === 'live' || viewMode === 'focus') {
    const host = document.querySelector<HTMLElement>('.milkdown-host')
    return { scrollEl: host, headingRoot: host }
  }
  if (viewMode === 'split') {
    const preview = document.querySelector<HTMLElement>('.preview-content')
    return { scrollEl: preview, headingRoot: preview }
  }
  // source：无渲染标题，不做 scroll spy
  return { scrollEl: null, headingRoot: null }
}

/** 根据编辑器滚动位置高亮 TOC 当前标题 */
export function useTocScrollSpy(viewMode: Ref<ViewMode>) {
  const store = useNoteStore()
  const activeHeadingIndex = ref(-1)
  let rafId = 0

  function updateActiveHeading() {
    const { headingRoot } = resolveScrollTarget(viewMode.value)
    if (!headingRoot) {
      activeHeadingIndex.value = -1
      return
    }
    const headings = Array.from(headingRoot.querySelectorAll<HTMLElement>(HEADING_SELECTOR))
    if (!headings.length) {
      activeHeadingIndex.value = -1
      return
    }
    const { scrollEl } = resolveScrollTarget(viewMode.value)
    const anchorTop = (scrollEl ?? headingRoot as HTMLElement).getBoundingClientRect().top + 80
    let active = 0
    for (let i = 0; i < headings.length; i++) {
      if (headings[i].getBoundingClientRect().top <= anchorTop) active = i
    }
    activeHeadingIndex.value = active
  }

  function onScroll() {
    if (rafId) cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      rafId = 0
      updateActiveHeading()
    })
  }

  function bindScroll() {
    const { scrollEl } = resolveScrollTarget(viewMode.value)
    scrollEl?.addEventListener('scroll', onScroll, { passive: true })
    updateActiveHeading()
    return scrollEl
  }

  let boundContainer: HTMLElement | null = null

  function rebind() {
    boundContainer?.removeEventListener('scroll', onScroll)
    boundContainer = bindScroll()
  }

  watch(
    () =>
      [store.currentNote?.id, store.tocVisible, store.liveContent.length, viewMode.value] as const,
    () => {
      requestAnimationFrame(rebind)
    }
  )

  onMounted(() => {
    rebind()
  })

  onBeforeUnmount(() => {
    boundContainer?.removeEventListener('scroll', onScroll)
    if (rafId) cancelAnimationFrame(rafId)
  })

  return { activeHeadingIndex }
}

import { watch, type Ref } from 'vue'
import type { useNoteStore } from '../stores/note'
import { scrollElementInContainer } from './useTocScroll'

const HEADING_SELECTOR = 'h1,h2,h3,h4,h5,h6'
const MAX_ATTEMPTS = 120

export function useTocJumpHandler(
  containerRef: Ref<HTMLElement | undefined>,
  store: ReturnType<typeof useNoteStore>
) {
  watch(() => store.tocJumpTarget?.id, () => {
    const target = store.tocJumpTarget
    const container = containerRef.value
    if (!target || !container) return

    const scrollContainer = container
    const headingIndex = target.index

    function attempt(remaining: number) {
      const el = scrollContainer.querySelectorAll(HEADING_SELECTOR)[headingIndex]
      if (el) {
        scrollElementInContainer(el, scrollContainer)
        return
      }
      if (remaining > 0) requestAnimationFrame(() => attempt(remaining - 1))
    }
    attempt(MAX_ATTEMPTS)
  })
}

import { watch, type Ref } from 'vue'
import type { useNoteStore } from '../stores/note'
import { scrollElementInContainer } from './useTocScroll'

const HEADING_SELECTOR = 'h1,h2,h3,h4,h5,h6'
const MAX_ATTEMPTS = 120

/** 监听 tocJumpTarget 变更，在预览容器中查找并滚动到对应标题（带重试机制，最多 120 帧） */
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

    /** 递归查找标题元素，找到则滚动，未找到则下一帧重试 */
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

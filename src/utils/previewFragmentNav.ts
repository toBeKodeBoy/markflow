import { scrollElementInContainer } from '../composables/useTocScroll'
import { HeadingSlugger } from './headingSlug'

const HEADING_SELECTOR = 'h1,h2,h3,h4,h5,h6'

function queryById(root: HTMLElement, id: string): Element | null {
  try {
    return root.querySelector(`#${CSS.escape(id)}`)
  } catch {
    return root.querySelector(`[id="${id.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`)
  }
}

/** 按标题 slug 顺序匹配（WYSIWYG 标题可能尚未写入 id） */
function findHeadingBySlug(root: HTMLElement, id: string): Element | null {
  const slugger = new HeadingSlugger()
  for (const heading of root.querySelectorAll(HEADING_SELECTOR)) {
    if (slugger.slug(heading.textContent ?? '') === id) return heading
  }
  return null
}

/** 在预览根节点内查找页内锚点目标元素 */
export function findFragmentTarget(root: HTMLElement, href: string): Element | null {
  if (!href.startsWith('#')) return null
  let id = href.slice(1)
  if (!id) return null
  try {
    id = decodeURIComponent(id)
  } catch {
    /* keep raw id */
  }
  return queryById(root, id) ?? findHeadingBySlug(root, id)
}

/** 拦截预览区内页内链接点击，在滚动容器内平滑跳转 */
export function handlePreviewFragmentClick(event: MouseEvent, root: HTMLElement | undefined): boolean {
  if (!root) return false
  const anchor = (event.target as Element | null)?.closest?.('a[href^="#"]')
  if (!anchor || !root.contains(anchor)) return false

  const href = anchor.getAttribute('href')
  if (!href || href === '#') return false

  const target = findFragmentTarget(root, href)
  if (!target) return false

  event.preventDefault()
  event.stopPropagation()
  scrollElementInContainer(target, root)
  return true
}

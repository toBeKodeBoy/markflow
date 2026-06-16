/** 从目标元素向上查找 root 范围内第一个可滚动的容器 */
export function resolveScrollContainer(root: Element, target: Element): Element {
  if (typeof root.contains !== 'function') return root

  let node: Element | null = target
  while (node && root.contains(node)) {
    const { overflowY } = getComputedStyle(node)
    if (/(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight + 1) {
      return node
    }
    node = node.parentElement
  }
  return root
}

/** 将容器内目标元素滚动到可见区域（带偏移边距） */
export function scrollElementInContainer(element: Element, container: Element, margin = 16) {
  const scrollContainer = resolveScrollContainer(container, element)
  const containerRect = scrollContainer.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  const offset = elementRect.top - containerRect.top + scrollContainer.scrollTop
  scrollContainer.scrollTo({ top: Math.max(0, offset - margin), behavior: 'smooth' })
}

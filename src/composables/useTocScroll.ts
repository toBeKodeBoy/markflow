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

export function scrollElementInContainer(element: Element, container: Element, margin = 16) {
  const scrollContainer = resolveScrollContainer(container, element)
  const containerRect = scrollContainer.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  const offset = elementRect.top - containerRect.top + scrollContainer.scrollTop
  scrollContainer.scrollTo({ top: Math.max(0, offset - margin), behavior: 'smooth' })
}

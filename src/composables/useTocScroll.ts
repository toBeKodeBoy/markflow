export function scrollElementInContainer(element: Element, container: Element, margin = 16) {
  const containerRect = container.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  const offset = elementRect.top - containerRect.top + container.scrollTop
  container.scrollTo({ top: Math.max(0, offset - margin), behavior: 'smooth' })
}

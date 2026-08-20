function hasModKey(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey
}

function eventKey(event: KeyboardEvent): string {
  return (event.key ?? '').toLowerCase()
}

function eventLetterCode(letter: string): string {
  return `Key${letter.toUpperCase()}`
}

/** Ctrl/Cmd + 字母，不含 Alt/Shift。用于新建、搜索。 */
export function isModKeyShortcut(event: KeyboardEvent, letter: string): boolean {
  if (!hasModKey(event) || event.altKey || event.shiftKey) return false
  if (event.code === eventLetterCode(letter)) return true
  return eventKey(event) === letter.toLowerCase()
}

/** Ctrl/Cmd + Alt + 字母，不含 Shift。用于打开设置。 */
export function isModAltKeyShortcut(event: KeyboardEvent, letter: string): boolean {
  if (!hasModKey(event) || !event.altKey || event.shiftKey) return false
  if (event.code === eventLetterCode(letter)) return true
  return eventKey(event) === letter.toLowerCase()
}

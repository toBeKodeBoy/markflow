/** 非激活 Tab 的内存草稿缓存，供 getNoteContentById 等读取，避免 store 循环依赖 */
const cache = new Map<string, string>()

export function setTabContentCache(noteId: string, content: string): void {
  cache.set(noteId, content)
}

export function getTabContentCache(noteId: string): string | undefined {
  return cache.get(noteId)
}

export function deleteTabContentCache(noteId: string): void {
  cache.delete(noteId)
}

export function clearTabContentCache(): void {
  cache.clear()
}

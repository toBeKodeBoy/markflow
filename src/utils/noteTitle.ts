const TITLE_SCAN_LINES = 50

/** 从内容中提取标题：优先取首个 # 标题，其次取首个非空行(限30字)，均无则返回"无标题" */
export function extractNoteTitle(content: string): string {
  let line = 0
  let start = 0
  while (line < TITLE_SCAN_LINES && start <= content.length) {
    const end = content.indexOf('\n', start)
    const lineEnd = end === -1 ? content.length : end
    const chunk = content.slice(start, lineEnd)
    const heading = chunk.match(/^#+\s+(.+)/)
    if (heading) return heading[1].trim()
    if (chunk.trim()) return chunk.trim().slice(0, 30)
    line++
    if (end === -1) break
    start = end + 1
  }
  return '无标题'
}

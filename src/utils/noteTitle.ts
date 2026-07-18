const TITLE_SCAN_LINES = 50

function extractFilenameStem(pathOrName?: string): string {
  if (!pathOrName) return ''
  const normalized = pathOrName.replace(/\\/g, '/')
  const name = normalized.slice(normalized.lastIndexOf('/') + 1)
  if (!name) return ''
  return name.replace(/\.[^.]+$/, '')
}

/** 从内容中提取标题：优先取文件名，其次取前 50 行内首个一级标题，均无则返回“无标题” */
export function extractNoteTitle(content: string, pathOrName?: string): string {
  const stem = extractFilenameStem(pathOrName)
  if (stem) return stem

  let line = 0
  let start = 0
  while (line < TITLE_SCAN_LINES && start <= content.length) {
    const end = content.indexOf('\n', start)
    const lineEnd = end === -1 ? content.length : end
    const chunk = content.slice(start, lineEnd)
    const heading = chunk.match(/^#\s+(.+)/)
    if (heading) return heading[1].trim()
    line++
    if (end === -1) break
    start = end + 1
  }
  return '无标题'
}

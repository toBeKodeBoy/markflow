const FENCE_LINE = /^(\s*)(`{3,}|~{3,})([^\n]*)$/

/** 根据新语言重建围栏 info 字符串，保留 title 等尾随属性 */
function buildFenceInfo(newLanguage: string, currentInfo: string): string {
  const trimmed = currentInfo.trim()
  if (!trimmed) return newLanguage

  const match = trimmed.match(/^(\S+)([\s\S]*)$/)
  if (!match) return newLanguage

  const trailing = match[2]
  if (newLanguage) {
    return trailing ? `${newLanguage}${trailing}` : newLanguage
  }
  return trailing.trimStart()
}

/**
 * 按索引更新 Markdown 中围栏代码块的语言标识。
 * @param markdown 原始 Markdown
 * @param blockIndex 目标代码块序号（从 0 开始）
 * @param language 新语言；空字符串表示移除语言 token
 */
export function updateFenceLanguage(
  markdown: string,
  blockIndex: number,
  language: string,
): string {
  const lines = markdown.split('\n')
  let index = -1
  let i = 0

  while (i < lines.length) {
    const openMatch = lines[i].match(FENCE_LINE)
    if (!openMatch) {
      i++
      continue
    }

    const indent = openMatch[1]
    const marker = openMatch[2]
    const info = openMatch[3]

    let j = i + 1
    let closed = false
    while (j < lines.length) {
      const closeMatch = lines[j].match(FENCE_LINE)
      if (closeMatch && closeMatch[1] === indent && closeMatch[2][0] === marker[0]) {
        closed = true
        break
      }
      j++
    }

    if (!closed) {
      i++
      continue
    }

    index++
    if (index === blockIndex) {
      lines[i] = `${indent}${marker}${buildFenceInfo(language, info)}`
      return lines.join('\n')
    }

    i = j + 1
  }

  return markdown
}

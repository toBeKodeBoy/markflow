const OPENING_FENCE_RE = /^([ \t]*)(`{3,}|~{3,})(.*)$/

function isClosingFence(line: string, marker: string, size: number): boolean {
  const closingRe = new RegExp(`^[ \\t]*\\${marker}{${size},}[ \\t]*$`)
  return closingRe.test(line)
}

function replaceInfoString(info: string, language: string): string {
  const leading = info.match(/^\s*/)?.[0] ?? ''
  const body = info.slice(leading.length)
  const firstToken = body.match(/^\S+/)?.[0] ?? ''
  const suffix = firstToken ? body.slice(firstToken.length) : ''
  const nextLanguage = language.trim()

  if (!firstToken) return nextLanguage ? `${leading}${nextLanguage}` : ''
  if (!nextLanguage) return suffix.trimStart()
  return `${leading}${nextLanguage}${suffix}`
}

export function updateFenceLanguage(markdown: string, blockIndex: number, language: string): string {
  if (blockIndex < 0) return markdown

  const newline = markdown.includes('\r\n') ? '\r\n' : '\n'
  const lines = markdown.split(newline)
  let currentIndex = 0
  let inFence = false
  let fenceMarker = ''
  let fenceSize = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (inFence) {
      if (isClosingFence(line, fenceMarker, fenceSize)) {
        inFence = false
        fenceMarker = ''
        fenceSize = 0
      }
      continue
    }

    const opening = line.match(OPENING_FENCE_RE)
    if (!opening) continue

    const [, indent, fence, info] = opening
    fenceMarker = fence[0]
    fenceSize = fence.length

    if (currentIndex === blockIndex) {
      lines[i] = `${indent}${fence}${replaceInfoString(info, language)}`
      return lines.join(newline)
    }

    currentIndex++
    inFence = true
  }

  return markdown
}

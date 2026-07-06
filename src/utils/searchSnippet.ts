import type { NoteListItem } from '../types'

export type SnippetSegment = { text: string; highlight: boolean }
export type SearchMatchKind = 'title' | 'body' | 'tag'

export interface SearchMatchInfo {
  kinds: SearchMatchKind[]
  snippet: SnippetSegment[] | null
  matchedTag?: string
}

/** 将文本按 query 切分为高亮/非高亮片段（大小写不敏感，保留原文） */
export function splitHighlightSegments(text: string, query: string): SnippetSegment[] {
  if (!query) return [{ text, highlight: false }]
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const segments: SnippetSegment[] = []
  let cursor = 0

  while (cursor < text.length) {
    const idx = lowerText.indexOf(lowerQuery, cursor)
    if (idx === -1) {
      segments.push({ text: text.slice(cursor), highlight: false })
      break
    }
    if (idx > cursor) {
      segments.push({ text: text.slice(cursor, idx), highlight: false })
    }
    segments.push({ text: text.slice(idx, idx + query.length), highlight: true })
    cursor = idx + query.length
  }

  return segments.length ? segments : [{ text, highlight: false }]
}

/** 轻量剥离 Markdown 标记，便于摘要阅读 */
function stripMarkdownNoise(text: string): string {
  return text
    .replace(/^#+\s+/gm, '')
    .replace(/\s#+\s+/g, ' ')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 从正文提取命中上下文摘要（±radius 字符），含关键词高亮 */
export function buildSearchSnippet(
  content: string,
  query: string,
  radius = 40
): SnippetSegment[] {
  const q = query.trim()
  if (!q) return []

  const cleaned = stripMarkdownNoise(content.replace(/\n/g, ' '))
  const lowerQuery = q.toLowerCase()
  const hit = cleaned.toLowerCase().indexOf(lowerQuery)
  if (hit === -1) return []

  const start = Math.max(0, hit - radius)
  const end = Math.min(cleaned.length, hit + q.length + radius)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < cleaned.length ? '…' : ''
  const raw = prefix + cleaned.slice(start, end) + suffix

  return splitHighlightSegments(raw, q)
}

/** 判定笔记与 query 的命中类型，并生成展示用摘要 */
export function getSearchMatchInfo(
  note: NoteListItem,
  query: string,
  contentBody?: string
): SearchMatchInfo {
  const q = query.trim()
  if (!q) return { kinds: [], snippet: null }

  const lowerQ = q.toLowerCase()
  const kinds: SearchMatchKind[] = []
  let matchedTag: string | undefined

  if (note.title.toLowerCase().includes(lowerQ)) {
    kinds.push('title')
  }

  const body = contentBody ?? ''
  const bodyHit = body.toLowerCase().includes(lowerQ)
  if (bodyHit) {
    kinds.push('body')
  }

  const tagHit = note.tags?.find((t) => t.toLowerCase().includes(lowerQ))
  if (tagHit) {
    kinds.push('tag')
    matchedTag = tagHit
  }

  let snippet: SnippetSegment[] | null = null
  if (bodyHit) {
    snippet = buildSearchSnippet(body, q)
  } else if (tagHit && !kinds.includes('title')) {
    snippet = [{ text: `#${tagHit}`, highlight: true }]
  }

  return { kinds, snippet, matchedTag }
}

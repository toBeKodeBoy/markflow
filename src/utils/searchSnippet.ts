import type { NoteListItem } from '../types'

export interface FuzzyMatchResult {
  matched: boolean
  score: number
  indices: number[]
}

export function fuzzyMatch(text: string, query: string): FuzzyMatchResult {
  if (!query) return { matched: false, score: 0, indices: [] }

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()

  const indices: number[] = []
  let queryIdx = 0
  let score = 0
  let lastMatchIdx = -1

  for (let i = 0; i < lowerText.length && queryIdx < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIdx]) {
      indices.push(i)
      if (lastMatchIdx >= 0) {
        const gap = i - lastMatchIdx
        score += gap === 1 ? 10 : Math.max(1, 6 - gap)
      } else {
        score += 10
      }
      if (i === 0 || lowerText[i - 1] === ' ' || lowerText[i - 1] === '/' || lowerText[i - 1] === '_' || lowerText[i - 1] === '-') {
        score += 8
      }
      lastMatchIdx = i
      queryIdx++
    }
  }

  if (queryIdx < lowerQuery.length) {
    return { matched: false, score: 0, indices: [] }
  }

  return { matched: true, score, indices }
}

export type SnippetSegment = { text: string; highlight: boolean }
export type SearchMatchKind = 'title' | 'body' | 'tag'

export interface SearchMatchInfo {
  kind: SearchMatchKind
  segments: SnippetSegment[]
}

export function splitHighlightSegments(text: string, query: string): SnippetSegment[] {
  if (!query) return [{ text, highlight: false }]
  const lowerText = text.toLowerCase()
  const lowerQ = query.toLowerCase()
  const idx = lowerText.indexOf(lowerQ)
  if (idx < 0) return [{ text, highlight: false }]

  const segments: SnippetSegment[] = []
  if (idx > 0) segments.push({ text: text.slice(0, idx), highlight: false })
  segments.push({ text: text.slice(idx, idx + lowerQ.length), highlight: true })
  const rest = idx + lowerQ.length
  if (rest < text.length) segments.push({ text: text.slice(rest), highlight: false })
  return segments
}

export function buildSearchSnippet(content: string, query: string, radius = 40): SnippetSegment[] {
  const q = query.trim()
  if (!q) return []
  const lower = content.toLowerCase()
  const lowerQ = q.toLowerCase()
  const idx = lower.indexOf(lowerQ)
  if (idx < 0) return []

  const start = Math.max(0, idx - radius)
  const end = Math.min(content.length, idx + lowerQ.length + radius)
  let text = content.slice(start, end)
  if (start > 0) text = `…${text}`
  if (end < content.length) text = `${text}…`

  const localIdx = text.toLowerCase().indexOf(lowerQ)
  if (localIdx < 0) return [{ text, highlight: false }]
  const matchText = text.slice(localIdx, localIdx + lowerQ.length)
  return splitHighlightSegments(text, matchText)
}

export function getSearchMatchInfo(
  note: NoteListItem,
  query: string,
  content: string
): SearchMatchInfo {
  const q = query.trim()
  const lowerQ = q.toLowerCase()

  if (note.title.toLowerCase().includes(lowerQ)) {
    return { kind: 'title', segments: splitHighlightSegments(note.title, q) }
  }

  const tagHit = note.tags?.find((t) => t.toLowerCase().includes(lowerQ))
  if (tagHit) {
    return { kind: 'tag', segments: splitHighlightSegments(tagHit, q) }
  }

  const bodySegments = buildSearchSnippet(content, q)
  return {
    kind: 'body',
    segments: bodySegments.length > 0 ? bodySegments : [{ text: content.slice(0, 80), highlight: false }],
  }
}

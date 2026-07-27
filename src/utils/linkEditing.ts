export interface LinkDraft {
  text: string
  url: string
  title: string
}

export interface TextRange {
  from: number
  to: number
}

export interface SourceLinkSelection extends TextRange {
  text: string
  url: string
  title: string
  editingExistingLink: boolean
}

type LinkEditSuccess = {
  ok: true
  content: string
  selection: TextRange
}

export type LinkEditFailure = {
  ok: false
  reason: string
}

export type LinkEditResult = LinkEditSuccess | LinkEditFailure

export const DEFAULT_LINK_TEXT = '链接文字'

interface MarkdownLinkMatch {
  from: number
  to: number
  text: string
  url: string
  title: string
}

export function isLinkEditFailure(value: SourceLinkSelection | LinkEditFailure): value is LinkEditFailure {
  return 'ok' in value && value.ok === false
}

function normalizeLinkText(text: string): string {
  return text.trim() || DEFAULT_LINK_TEXT
}

function normalizeLineBreaks(text: string): string {
  return text.replace(/\r\n?/g, '\n')
}

function escapeLinkTitle(title: string): string {
  return title.replace(/"/g, '\\"')
}

function lineBounds(content: string, index: number): TextRange {
  const start = content.lastIndexOf('\n', Math.max(0, index - 1)) + 1
  const nextBreak = content.indexOf('\n', index)
  return { from: start, to: nextBreak >= 0 ? nextBreak : content.length }
}

function isInsideFencedCodeBlock(content: string, index: number): boolean {
  const before = normalizeLineBreaks(content).slice(0, index)
  const lines = before.split('\n')
  let inFence = false

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
  }
  return inFence
}

function isInsideInlineCode(line: string, column: number): boolean {
  const prefix = line.slice(0, column)
  const ticks = (prefix.match(/`/g) ?? []).length
  return ticks % 2 === 1
}

function findMarkdownLinkAt(content: string, range: TextRange): MarkdownLinkMatch | null {
  const re = /\[([^\]\n]*)\]\(([^)\n]*?)(?:\s+"([^"\n]*)")?\)/g
  let match: RegExpExecArray | null

  while ((match = re.exec(content)) !== null) {
    const from = match.index
    const to = from + match[0].length
    const touches =
      (range.from >= from && range.from <= to) ||
      (range.to >= from && range.to <= to) ||
      (range.from <= from && range.to >= to)

    if (!touches) continue

    return {
      from,
      to,
      text: match[1] ?? '',
      url: (match[2] ?? '').trim(),
      title: match[3] ?? '',
    }
  }

  return null
}

export function getInitialLinkDraft(selectedText: string): LinkDraft {
  return {
    text: selectedText.trim() || DEFAULT_LINK_TEXT,
    url: '',
    title: '',
  }
}

export function buildMarkdownLink(draft: LinkDraft): string {
  const text = normalizeLinkText(draft.text)
  const url = draft.url.trim()
  const title = draft.title.trim()
  if (!title) return `[${text}](${url})`
  return `[${text}](${url} "${escapeLinkTitle(title)}")`
}

export function readSourceLinkSelection(content: string, range: TextRange): SourceLinkSelection | LinkEditFailure {
  const normalizedRange = {
    from: Math.max(0, range.from),
    to: Math.max(0, range.to),
  }
  const existing = findMarkdownLinkAt(content, normalizedRange)
  if (existing) {
    return {
      ...existing,
      editingExistingLink: true,
    }
  }

  const selectedText = content.slice(normalizedRange.from, normalizedRange.to)
  if (selectedText.includes('\n')) {
    return { ok: false, reason: '请选择单一连续文本后再插入链接' }
  }

  const line = lineBounds(content, normalizedRange.from)
  const lineText = content.slice(line.from, line.to)
  const column = normalizedRange.from - line.from
  if (isInsideFencedCodeBlock(content, normalizedRange.from) || isInsideInlineCode(lineText, column)) {
    return { ok: false, reason: '代码块中不能插入链接' }
  }

  return {
    ...normalizedRange,
    text: selectedText.trim() || DEFAULT_LINK_TEXT,
    url: '',
    title: '',
    editingExistingLink: false,
  }
}

export function replaceMarkdownSelectionWithLink(
  content: string,
  range: TextRange,
  draft: LinkDraft,
): LinkEditResult {
  const selection = readSourceLinkSelection(content, range)
  if (isLinkEditFailure(selection)) return selection

  const nextLink = buildMarkdownLink({
    text: draft.text || selection.text,
    url: draft.url,
    title: draft.title,
  })
  const nextContent = `${content.slice(0, selection.from)}${nextLink}${content.slice(selection.to)}`

  return {
    ok: true,
    content: nextContent,
    selection: {
      from: selection.from + 1,
      to: selection.from + 1 + normalizeLinkText(draft.text || selection.text).length,
    },
  }
}

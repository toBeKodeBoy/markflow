import type { ParsedTaskLine } from '../types/task'

const TASK_LINE_RE = /^(\s*)([-*+]|\d+\.)\s+\[([ xX])\](?:\s+(.*))?$/

export function parseTaskLine(lineText: string, line: number): ParsedTaskLine | null {
  const match = TASK_LINE_RE.exec(lineText)
  if (!match) return null

  return {
    line,
    checked: match[3].toLowerCase() === 'x',
    indent: match[1].length,
    marker: match[2],
    text: match[4] ?? '',
  }
}

export function parseTaskLines(markdown: string): ParsedTaskLine[] {
  return markdown
    .split(/\r?\n/)
    .map((lineText, index) => parseTaskLine(lineText, index + 1))
    .filter((item): item is ParsedTaskLine => item !== null)
}

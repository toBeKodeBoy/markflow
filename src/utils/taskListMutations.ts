import { parseTaskLine } from './taskListParse'

export function toggleTaskCheckedByLine(markdown: string, line: number): string {
  const lines = markdown.split(/\r?\n/)
  const index = line - 1
  const targetLine = lines[index]

  if (index < 0 || targetLine === undefined) return markdown

  const task = parseTaskLine(targetLine, line)
  if (!task) return markdown

  lines[index] = targetLine.replace(/\[([ xX])\]/, task.checked ? '[ ]' : '[x]')
  return lines.join('\n')
}

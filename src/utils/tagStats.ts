import type { NoteListItem, TagStat } from '../types'

/** 从笔记列表统计标签使用频率（大小写合并，展示保留首次写法） */
export function buildTagStats(notes: NoteListItem[]): TagStat[] {
  const map = new Map<string, { tag: string; count: number }>()
  for (const note of notes) {
    for (const raw of note.tags ?? []) {
      const t = raw.trim()
      if (!t) continue
      const key = t.toLowerCase()
      const prev = map.get(key)
      if (prev) prev.count++
      else map.set(key, { tag: t, count: 1 })
    }
  }
  const list = [...map.values()]
  const max = Math.max(1, ...list.map((x) => x.count))
  return list
    .map((x) => ({ ...x, weight: x.count / max }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh'))
}

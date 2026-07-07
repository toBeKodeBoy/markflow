import { describe, it, expect } from 'vitest'
import { buildTagStats } from '../../../src/utils/tagStats'
import type { NoteListItem } from '../../../src/types'

function note(tags: string[]): NoteListItem {
  return { id: '1', title: 't', updatedAt: 1, tags }
}

describe('buildTagStats', () => {
  it('按 count 降序，同 count 按 tag 字母序', () => {
    const stats = buildTagStats([
      note(['b', 'a']),
      note(['a']),
      note(['a']),
    ])
    expect(stats.map((s) => s.tag)).toEqual(['a', 'b'])
    expect(stats[0].count).toBe(3)
    expect(stats[1].count).toBe(1)
  })

  it('大小写合并并保留首次写法', () => {
    const stats = buildTagStats([note(['API', 'api']), note(['Api'])])
    expect(stats).toHaveLength(1)
    expect(stats[0].tag).toBe('API')
    expect(stats[0].count).toBe(3)
  })

  it('weight 相对最大 count 归一化', () => {
    const stats = buildTagStats([note(['hot', 'hot']), note(['cold'])])
    const hot = stats.find((s) => s.tag === 'hot')!
    const cold = stats.find((s) => s.tag === 'cold')!
    expect(hot.weight).toBe(1)
    expect(cold.weight).toBe(0.5)
  })

  it('忽略空串与仅空白标签', () => {
    expect(buildTagStats([note(['', '  ', 'ok'])])).toEqual([
      { tag: 'ok', count: 1, weight: 1 },
    ])
  })
})

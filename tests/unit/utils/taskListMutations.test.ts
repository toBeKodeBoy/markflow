import { describe, expect, it } from 'vitest'
import { parseTaskLines } from '../../../src/utils/taskListParse'
import { toggleTaskCheckedByLine } from '../../../src/utils/taskListMutations'

describe('parseTaskLines', () => {
  it('提取任务行号、勾选状态与缩进', () => {
    const markdown = [
      '# 今日任务',
      '',
      '- [ ] 第一项',
      '  - [x] 子任务',
      '* 普通列表',
      '1. [X] 编号任务',
    ].join('\n')

    expect(parseTaskLines(markdown)).toEqual([
      { line: 3, checked: false, indent: 0, marker: '-', text: '第一项' },
      { line: 4, checked: true, indent: 2, marker: '-', text: '子任务' },
      { line: 6, checked: true, indent: 0, marker: '1.', text: '编号任务' },
    ])
  })
})

describe('toggleTaskCheckedByLine', () => {
  it('按行号切换未完成任务为已完成', () => {
    const markdown = '- [ ] 第一项\n- [x] 第二项'

    expect(toggleTaskCheckedByLine(markdown, 1)).toBe('- [x] 第一项\n- [x] 第二项')
  })

  it('按行号切换已完成任务为未完成', () => {
    const markdown = '- [x] 第一项\n- [ ] 第二项'

    expect(toggleTaskCheckedByLine(markdown, 1)).toBe('- [ ] 第一项\n- [ ] 第二项')
  })

  it('同名任务时只切换目标行，避免误改', () => {
    const markdown = '- [ ] 重复任务\n- [ ] 重复任务\n- [x] 其他任务'

    expect(toggleTaskCheckedByLine(markdown, 2)).toBe('- [ ] 重复任务\n- [x] 重复任务\n- [x] 其他任务')
  })

  it('目标行不是任务时返回原文', () => {
    const markdown = '# 标题\n普通段落\n- [ ] 任务'

    expect(toggleTaskCheckedByLine(markdown, 2)).toBe(markdown)
  })
})

import { describe, expect, it } from 'vitest'
import {
  buildMarkdownLink,
  getInitialLinkDraft,
  replaceMarkdownSelectionWithLink,
} from '../../../src/utils/linkEditing'

describe('buildMarkdownLink', () => {
  it('应生成不带 title 的 Markdown 链接', () => {
    expect(buildMarkdownLink({ text: 'OpenAI', url: 'https://openai.com', title: '' })).toBe(
      '[OpenAI](https://openai.com)'
    )
  })

  it('应生成带 title 的 Markdown 链接', () => {
    expect(buildMarkdownLink({ text: 'OpenAI', url: 'https://openai.com', title: '官网' })).toBe(
      '[OpenAI](https://openai.com "官网")'
    )
  })
})

describe('getInitialLinkDraft', () => {
  it('有选区时应预填选中文本', () => {
    expect(getInitialLinkDraft('已选文本')).toEqual({
      text: '已选文本',
      url: '',
      title: '',
    })
  })

  it('无选区时应回退到默认链接文本', () => {
    expect(getInitialLinkDraft('')).toEqual({
      text: '链接文字',
      url: '',
      title: '',
    })
  })
})

describe('replaceMarkdownSelectionWithLink', () => {
  it('应将单行选区替换为带 title 的 Markdown 链接', () => {
    const content = '访问 OpenAI 官网'
    const start = content.indexOf('OpenAI')
    const end = start + 'OpenAI'.length

    const result = replaceMarkdownSelectionWithLink(
      content,
      { from: start, to: end },
      { text: 'OpenAI', url: 'https://openai.com', title: '官网' },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.content).toBe('访问 [OpenAI](https://openai.com "官网") 官网')
  })

  it('空选区时应插入默认链接文本', () => {
    const result = replaceMarkdownSelectionWithLink(
      'hello',
      { from: 0, to: 0 },
      { text: '', url: 'https://openai.com', title: '' },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.content).toBe('[链接文字](https://openai.com)hello')
  })

  it('跨行选区应拒绝替换，避免破坏结构', () => {
    const content = '- 第一项\n- 第二项'
    const result = replaceMarkdownSelectionWithLink(
      content,
      { from: 2, to: content.length - 2 },
      { text: '第一项 第二项', url: 'https://openai.com', title: '' },
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('单一连续文本')
  })

  it('光标位于已有链接中时应整体更新原链接', () => {
    const content = '参考 [旧链接](https://old.example "旧标题") 资料'
    const cursor = content.indexOf('旧链接') + 1

    const result = replaceMarkdownSelectionWithLink(
      content,
      { from: cursor, to: cursor },
      { text: '新链接', url: 'https://new.example', title: '新标题' },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.content).toBe('参考 [新链接](https://new.example "新标题") 资料')
  })
})

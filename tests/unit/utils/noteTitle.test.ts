import { describe, expect, it } from 'vitest'
import { extractNoteTitle } from '../../../src/utils/noteTitle'

describe('extractNoteTitle', () => {
  it('优先返回文件名去扩展名', () => {
    expect(extractNoteTitle('# 正文标题\n\n内容', 'imported.md')).toBe('imported')
    expect(extractNoteTitle('# 正文标题\n\n内容', 'docs/guide.txt')).toBe('guide')
  })

  it('文件名无有效 stem 时仅识别一级标题', () => {
    expect(extractNoteTitle('前言\n# 一级标题\n内容', '.md')).toBe('一级标题')
    expect(extractNoteTitle('## 二级标题\n内容', '.md')).toBe('无标题')
  })

  it('忽略一级标题之前的非空行，不再回退首个非空行', () => {
    expect(extractNoteTitle('前言\n\n正文\n', '.md')).toBe('无标题')
  })

  it('仅在前 50 行内查找一级标题', () => {
    const lines = Array.from({ length: 50 }, (_, i) => `第${i + 1}行`)
    const content = `${lines.join('\n')}\n# 第51行标题`
    expect(extractNoteTitle(content, '.md')).toBe('无标题')
  })
})

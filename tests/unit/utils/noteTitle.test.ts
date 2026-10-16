import { describe, expect, it } from 'vitest'
import { buildBlankDocumentTitle, extractNoteTitle } from '../../../src/utils/noteTitle'

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

  it('剥离一级标题中的内联 Markdown 语法', () => {
    expect(extractNoteTitle('# **加粗标题**\n', '.md')).toBe('加粗标题')
    expect(extractNoteTitle('# [链接](https://a.com) 标题\n', '.md')).toBe('链接 标题')
  })

  it('路径以斜杠结尾时 name 为空，回退到标题提取', () => {
    expect(extractNoteTitle('# 标题\n', 'folder/')).toBe('标题')
  })

  it('未传入路径时回退到标题提取', () => {
    expect(extractNoteTitle('# 标题\n')).toBe('标题')
  })

  it('空白文档标题默认当天日期，同日重复从 (1) 递增', () => {
    const now = new Date(2026, 9, 16)
    expect(buildBlankDocumentTitle([], now)).toBe('2026-10-16')
    expect(buildBlankDocumentTitle(['2026-10-16'], now)).toBe('2026-10-16 (1)')
    expect(buildBlankDocumentTitle(['2026-10-16', '2026-10-16 (1)'], now)).toBe('2026-10-16 (2)')
  })

  it('空白文档标题跳过已被占用的序号', () => {
    const now = new Date(2026, 9, 16)
    expect(buildBlankDocumentTitle(['2026-10-16', '2026-10-16 (2)'], now)).toBe('2026-10-16 (1)')
  })

  it('其他日期或其他标题不占用当天序号', () => {
    const now = new Date(2026, 9, 16)
    expect(buildBlankDocumentTitle(['2026-10-15', '2026-10-15 (1)', '无标题'], now)).toBe('2026-10-16')
  })

  it('纯星号串标题剥离后保留原文', () => {
    // stripInlineMarkdown 对纯星号串 `****` 不匹配任何规则，返回原文
    expect(extractNoteTitle('# ****\n', '.md')).toBe('****')
  })
})

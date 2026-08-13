/**
 * stripInlineMarkdown 单元测试 — 验证内联 Markdown 语法剥离
 * @file tests/unit/utils/stripInlineMarkdown.test.ts
 */
import { describe, expect, it } from 'vitest'
import { stripInlineMarkdown } from '../../../src/utils/stripInlineMarkdown'

describe('stripInlineMarkdown', () => {
  it('纯文本原样返回', () => {
    expect(stripInlineMarkdown('普通标题')).toBe('普通标题')
  })

  it('剥离加粗语法', () => {
    expect(stripInlineMarkdown('**项目计划**')).toBe('项目计划')
  })

  it('剥离斜体语法', () => {
    expect(stripInlineMarkdown('*斜体文字*')).toBe('斜体文字')
  })

  it('剥离加粗斜体混合语法', () => {
    expect(stripInlineMarkdown('***混合***')).toBe('混合')
  })

  it('剥离行内代码语法', () => {
    expect(stripInlineMarkdown('`Promise` 指南')).toBe('Promise 指南')
  })

  it('剥离删除线语法', () => {
    expect(stripInlineMarkdown('~~废弃方案~~')).toBe('废弃方案')
  })

  it('剥离链接语法保留链接文本', () => {
    expect(stripInlineMarkdown('[MDN](https://mdn.io)')).toBe('MDN')
  })

  it('剥离图片语法保留 alt 文本', () => {
    expect(stripInlineMarkdown('![img](url)')).toBe('img')
  })

  it('剥离高亮语法', () => {
    expect(stripInlineMarkdown('==高亮==')).toBe('高亮')
  })

  it('剥离 HTML 标签', () => {
    expect(stripInlineMarkdown('<u>下划线</u>')).toBe('下划线')
  })

  it('混合多种语法一并剥离', () => {
    expect(stripInlineMarkdown('**使用** `Promise` 指南')).toBe('使用 Promise 指南')
  })

  it('空输入返回空字符串', () => {
    expect(stripInlineMarkdown('')).toBe('')
  })

  it('纯语法标记剥离后为空则回退原文', () => {
    expect(stripInlineMarkdown('****')).toBe('****')
  })

  it('嵌套语法正确剥离', () => {
    expect(stripInlineMarkdown('**加粗中有 *斜体***')).toBe('加粗中有 斜体')
  })

  // 额外边界用例
  it('null/undefined 输入原样返回（健壮性）', () => {
    expect(stripInlineMarkdown(null as unknown as string)).toBeNull()
    expect(stripInlineMarkdown(undefined as unknown as string)).toBeUndefined()
  })

  it('仅空白剥离后为空回退原文', () => {
    expect(stripInlineMarkdown('   ')).toBe('   ')
  })

  it('多重嵌套混合语法（加粗包裹链接）', () => {
    expect(stripInlineMarkdown('**[链接](url)**')).toBe('链接')
  })

  // Minor1：数学尖括号不应被误剥为 HTML
  it('数学比较符尖括号不应被误剥为 HTML（Minor1）', () => {
    expect(stripInlineMarkdown('条件 x < 5 且 y > 3')).toBe('条件 x < 5 且 y > 3')
  })

  // Minor2：下划线斜体/加粗应被剥离
  it('剥离下划线斜体语法（Minor2）', () => {
    expect(stripInlineMarkdown('_强调_')).toBe('强调')
  })

  it('剥离下划线加粗语法（Minor2）', () => {
    expect(stripInlineMarkdown('__加粗__')).toBe('加粗')
  })

  // 回归保护：真实 HTML 标签仍正常剥离
  it('HTML 标签仍正常剥离（回归保护）', () => {
    expect(stripInlineMarkdown('<u>下划线</u>')).toBe('下划线')
  })

  it('自闭合 HTML 标签剥离为空', () => {
    expect(stripInlineMarkdown('<br/>')).toBe('')
  })

  it('HTML 注释剥离为空', () => {
    expect(stripInlineMarkdown('<!--comment-->')).toBe('')
  })
})

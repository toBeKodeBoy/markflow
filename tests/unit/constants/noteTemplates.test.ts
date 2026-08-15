import { describe, it, expect } from 'vitest'
import {
  NOTE_TEMPLATES,
  buildTemplateNoteTitle,
  renderTemplateContent,
  uniquifyNoteTitle,
} from '../../../src/constants/noteTemplates'

describe('NOTE_TEMPLATES', () => {
  it('应包含 PRD 约定的四类模板，并带图标与色调', () => {
    expect(NOTE_TEMPLATES.map((item) => item.id)).toEqual([
      'tech-doc',
      'study-note',
      'journal-plan',
      'agent-prompt',
    ])
    expect(NOTE_TEMPLATES).toHaveLength(4)
    for (const item of NOTE_TEMPLATES) {
      expect(item.title.length).toBeGreaterThan(0)
      expect(item.description.length).toBeGreaterThan(0)
      expect(item.icon).toBeTruthy()
      expect(item.iconTone).toBeTruthy()
      expect(item.content).toMatch(/^# /)
      expect(item.content.length).toBeGreaterThan(180)
    }
  })

  it('技术开发文档应含接口表与故障排查结构', () => {
    const content = NOTE_TEMPLATES[0].content
    expect(content).toMatch(/背景/)
    expect(content).toMatch(/接口/)
    expect(content).toMatch(/故障排查/)
    expect(content).toMatch(/```/)
  })

  it('学习教程笔记应含任务清单与复习提纲', () => {
    const content = NOTE_TEMPLATES[1].content
    expect(content).toMatch(/知识点/)
    expect(content).toMatch(/复习/)
    expect(content).toMatch(/- \[[ x]\]/)
  })

  it('日常随笔计划应含日期占位与复盘', () => {
    const content = NOTE_TEMPLATES[2].content
    expect(content).toMatch(/\{\{date\}\}/)
    expect(content).toMatch(/要做/)
    expect(content).toMatch(/复盘/)
  })

  it('Agent 提示词应含角色任务约束', () => {
    const content = NOTE_TEMPLATES[3].content
    expect(content).toMatch(/角色/)
    expect(content).toMatch(/任务/)
    expect(content).toMatch(/约束/)
    expect(content).toMatch(/输入/)
  })

  it('日常随笔标题应带当天日期，其余使用模板名', () => {
    const now = new Date('2026-08-15T08:00:00')
    expect(buildTemplateNoteTitle(NOTE_TEMPLATES[0], now)).toBe('技术开发文档')
    expect(buildTemplateNoteTitle(NOTE_TEMPLATES[2], now)).toBe('日常随笔计划 · 2026-08-15')
  })

  it('渲染模板时应替换标题与日期占位', () => {
    const now = new Date('2026-08-15T08:00:00')
    const rendered = renderTemplateContent(NOTE_TEMPLATES[2], '日常随笔计划 · 2026-08-15', now)
    expect(rendered).toContain('日常随笔计划 · 2026-08-15')
    expect(rendered).toContain('2026-08-15')
    expect(rendered).not.toMatch(/\{\{date\}\}/)
    expect(rendered).not.toMatch(/\{\{title\}\}/)
  })

  it('重名标题应追加序号', () => {
    expect(uniquifyNoteTitle('技术开发文档', [])).toBe('技术开发文档')
    expect(uniquifyNoteTitle('技术开发文档', ['技术开发文档'])).toBe('技术开发文档 (2)')
    expect(uniquifyNoteTitle('技术开发文档', ['技术开发文档', '技术开发文档 (2)'])).toBe(
      '技术开发文档 (3)',
    )
  })
})

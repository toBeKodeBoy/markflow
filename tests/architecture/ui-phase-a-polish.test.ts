/**
 * UI Phase A 优化约束（docs/plans/界面优化机会说明.md）
 * A1 顶栏搜索入口 · A2 死 CSS/文档清债 · A3 PDF 文案 · A4 图标统一
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')

function readSrc(rel: string) {
  return readFileSync(resolve(root, rel), 'utf-8')
}

describe('A1 顶栏搜索入口与 App 同源', () => {
  const toolbarSrc = readSrc('src/components/Toolbar.vue')
  const appSrc = readSrc('src/App.vue')

  it('Toolbar 应提供可见搜索按钮并声明 openSearch 事件', () => {
    expect(toolbarSrc).toMatch(/data-testid=["']toolbar-search-bar["']/)
    expect(toolbarSrc).toMatch(/openSearch/)
    expect(toolbarSrc).toMatch(/aria-label=["']搜索笔记["']/)
  })

  it('App 应将 Toolbar openSearch 接到同一 searchModalVisible', () => {
    expect(appSrc).toMatch(/@openSearch=["'][^"']*["']|@open-search=["'][^"']*["']/)
    expect(appSrc).toMatch(/searchModalVisible/)
  })
})

describe('A2 标签与侧栏搜索遗留清债', () => {
  const css = readSrc('src/style.css')
  const readme = readSrc('README.md')

  it('style.css 不应再保留侧栏搜索/标签云死样式', () => {
    expect(css).not.toMatch(/\.sidebar-search\s*\{/)
    expect(css).not.toMatch(/\.sidebar-tags\s*\{/)
    expect(css).not.toMatch(/\.tag-cloud-panel\s*\{/)
    expect(css).not.toMatch(/\.note-tags-bar\s*,/)
    expect(css).not.toMatch(/\.search-result-item\s*\{/)
  })

  it('README 不应再宣传已移除的标签组件', () => {
    expect(readme).not.toMatch(/TagInput/)
    expect(readme).not.toMatch(/NoteTagsBar/)
    expect(readme).not.toMatch(/TagCloud/)
    expect(readme).not.toMatch(/useTagCloudLayout/)
    expect(readme).not.toMatch(/tagNormalize/)
  })

  it('src/components 下不应存在标签相关组件文件', () => {
    for (const name of ['TagInput.vue', 'NoteTagsBar.vue', 'TagCloud.vue', 'TagCloudPanel.vue']) {
      expect(existsSync(resolve(root, 'src/components', name))).toBe(false)
    }
  })
})

describe('A3 设置 PDF 文案', () => {
  it('SettingsModal 应指引文件菜单导出 PDF，而非已不存在的顶栏 PDF 按钮', () => {
    const src = readSrc('src/components/SettingsModal.vue')
    expect(src).toMatch(/文件/)
    expect(src).toMatch(/导出 PDF|PDF/)
    expect(src).not.toMatch(/工具栏「PDF」按钮/)
  })
})

describe('A4 图标统一（去 emoji）', () => {
  const iconSrc = readSrc('src/components/AppIcon.vue')
  const searchModal = readSrc('src/components/SearchModal.vue')
  const treeRow = readSrc('src/components/SidebarTreeRow.vue')

  it('AppIcon 应支持 search 与 pin', () => {
    expect(iconSrc).toMatch(/name === 'search'/)
    expect(iconSrc).toMatch(/name === 'pin'/)
    expect(iconSrc).toMatch(/\| 'search'/)
    expect(iconSrc).toMatch(/\| 'pin'/)
  })

  it('SearchModal 头部应使用 AppIcon search，而非 emoji', () => {
    expect(searchModal).toMatch(/AppIcon[\s\S]*name=["']search["']|name=["']search["']/)
    expect(searchModal).not.toMatch(/🔍/)
  })

  it('SidebarTreeRow 置顶标记应使用 AppIcon pin，而非 emoji', () => {
    expect(treeRow).toMatch(/AppIcon[\s\S]*name=["']pin["']|name=["']pin["']/)
    expect(treeRow).not.toMatch(/📌/)
  })
})

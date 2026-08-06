/**
 * 工具栏右上角视图模式下拉约束
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')

function readSrc(rel: string) {
  return readFileSync(resolve(root, rel), 'utf-8')
}

describe('ViewMode 工具栏下拉', () => {
  const app = readSrc('src/App.vue')
  const formatToolbar = readSrc('src/components/FormatToolbar.vue')
  const css = readSrc('src/style.css')
  const icons = readSrc('src/components/AppIcon.vue')

  it('FormatToolbar 右端挂载 ViewModeDropdown', () => {
    expect(formatToolbar).toMatch(/ViewModeDropdown/)
    expect(formatToolbar).toMatch(/:view-mode="viewMode"/)
    expect(readSrc('src/components/ViewModeDropdown.vue')).toMatch(
      /data-testid="view-mode-dropdown"/,
    )
  })

  it('App 不再挂载右侧悬浮热区面板', () => {
    expect(app).not.toMatch(/ViewModeHoverPanel/)
    expect(existsSync(resolve(root, 'src/components/ViewModeHoverPanel.vue'))).toBe(false)
  })

  it('AppIcon 提供四视图图标', () => {
    expect(icons).toMatch(/view-live|view-preview/)
    expect(icons).toMatch(/view-split/)
    expect(icons).toMatch(/view-source/)
    expect(icons).toMatch(/view-focus/)
  })

  it('下拉推到工具栏右侧，且菜单项不被工具栏方按钮样式压成竖排', () => {
    expect(css).toMatch(/\.view-mode-dropdown[\s\S]*?margin-left:\s*auto/)
    expect(css).toMatch(/\.editor-toolbar \.toolbar-group button[\s\S]*?width:\s*28px/)
    expect(css).toMatch(/\.view-mode-dropdown-menu button[\s\S]*?white-space:\s*nowrap/)
    expect(css).toMatch(/\.view-mode-dropdown-menu button[\s\S]*?width:\s*100%/)
  })
})

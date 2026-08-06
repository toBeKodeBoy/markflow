/**
 * GCCD：视图切换入口（工具栏下拉）约束 — 替代右侧热区
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')

function readSrc(rel: string) {
  return readFileSync(resolve(root, rel), 'utf-8')
}

describe('GCCD 视图切换（工具栏下拉）', () => {
  const app = readSrc('src/App.vue')
  const types = readSrc('src/types/index.ts')
  const tabs = readSrc('src/stores/editorTabs.ts')
  const panel = readSrc('src/components/ViewModeDropdown.vue')

  it('App 不再挂载右侧悬浮热区', () => {
    expect(app).not.toMatch(/ViewModeHoverPanel/)
    expect(existsSync(resolve(root, 'src/components/ViewModeHoverPanel.vue'))).toBe(false)
  })

  it('快捷键 Ctrl+Shift+J/K/L/M 仅在有打开文档时生效', () => {
    expect(app).toMatch(/shiftKey/)
    expect(app).toMatch(/hasOpenTabs/)
    expect(app).toMatch(/VIEW_MODE_SHORTCUTS|toLowerCase\(\)/)
  })

  it('下拉含快捷键提示与四模式', () => {
    expect(panel).toMatch(/Ctrl\+Shift\+[JKLM]/)
    expect(panel).toMatch(/view-mode-dropdown/)
  })

  it('EditorTab 绑定 viewMode；新建默认 live（预览）', () => {
    expect(types).toMatch(/viewMode:\s*ViewMode/)
    expect(tabs).toMatch(/viewMode:\s*normalizeViewMode|viewMode:\s*'live'|DEFAULT_VIEW_MODE/)
    expect(tabs).toMatch(/openTabForNewNote[\s\S]*'live'/)
  })
})

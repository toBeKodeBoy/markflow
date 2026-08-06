/**
 * 四视图 UI P0/P1 约束
 * P0：源码去幽灵边线、空态主色、Focus 工具栏图标化、字数只留底栏
 * P1：模式切换与 Tab 合并为一行、FormatToolbar 压缩高度
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')

function readSrc(rel: string) {
  return readFileSync(resolve(root, rel), 'utf-8')
}

describe('P0 一致性', () => {
  const css = readSrc('src/style.css')
  const formatToolbar = readSrc('src/components/FormatToolbar.vue')
  const focusToolbar = readSrc('src/components/FocusFormatToolbar.vue')
  const editor = readSrc('src/components/Editor.vue')
  const wysiwyg = readSrc('src/components/WysiwygEditor.vue')
  const app = readSrc('src/App.vue')

  it('源码/预览模式 editor-pane 不应保留右侧分割线；分屏才保留', () => {
    expect(css).toMatch(/\.mode-split \.editor-pane[\s\S]*?border-right:\s*1px solid var\(--border\)/)
    // 基类不应再无条件画 border-right，或明确在 live/source 关闭
    const baseBlock = css.match(/\.editor-pane\s*\{[^}]*\}/)?.[0] ?? ''
    const liveClears =
      /\.mode-live \.editor-pane[\s\S]*?border-right:\s*none/.test(css) ||
      /\.mode-source \.editor-pane[\s\S]*?border-right:\s*none/.test(css)
    const baseHasBorder = /border-right:\s*1px solid var\(--border\)/.test(baseBlock)
    expect(baseHasBorder ? liveClears : true).toBe(true)
    if (!baseHasBorder) {
      expect(css).toMatch(/\.mode-split \.editor-pane[\s\S]*?border-right/)
    }
  })

  it('空 Tab 态渐变应使用主色 #5243E8 / --primary，而非旧 indigo', () => {
    expect(css).not.toMatch(/empty-tabs-state[\s\S]*?rgba\(\s*99\s*,\s*102\s*,\s*241/)
    expect(css).toMatch(
      /\.empty-tabs-state[\s\S]*?(?:#5243E8|var\(--primary\)|rgba\(\s*82\s*,\s*67\s*,\s*232)/,
    )
  })

  it('FocusFormatToolbar 应使用 AppIcon，而非纯文字标签', () => {
    expect(focusToolbar).toMatch(/import AppIcon from ['"]\.\/AppIcon\.vue['"]/)
    expect(focusToolbar).toMatch(/<AppIcon name="bold"/)
    expect(focusToolbar).toMatch(/<AppIcon name="italic"/)
    expect(focusToolbar).toMatch(/<AppIcon name="highlight"/)
    expect(focusToolbar).toMatch(/<AppIcon name="heading"/)
    expect(focusToolbar).toMatch(/<AppIcon name="list"/)
    expect(focusToolbar).toMatch(/<AppIcon name="image"/)
    expect(focusToolbar).not.toMatch(/>\s*<b>B<\/b>\s*</)
    expect(focusToolbar).not.toMatch(/>\s*高亮\s*</)
  })

  it('FormatToolbar 不再展示字数；底栏保留字数', () => {
    expect(formatToolbar).not.toMatch(/class="char-count"/)
    expect(formatToolbar).not.toMatch(/charCount/)
    expect(editor).not.toMatch(/:char-count/)
    expect(wysiwyg).not.toMatch(/:char-count/)
    expect(app).toMatch(/status-bar-right[\s\S]*\{\{\s*charCount\s*\}\}\s*字/)
  })
})

describe('P1 垂直密度', () => {
  const app = readSrc('src/App.vue')
  const css = readSrc('src/style.css')

  it('Tab 独占 chrome 行；模式切换在 FormatToolbar 下拉', () => {
    expect(app).toMatch(/workspace-chrome-bar|data-testid="workspace-chrome-bar"/)
    const chromeBlock =
      app.match(
        /<div\s+v-if="hasOpenTabs && viewMode !== 'focus'"[\s\S]*?data-testid="workspace-chrome-bar"[\s\S]*?<\/div>/,
      )?.[0] ?? ''
    expect(chromeBlock).toMatch(/EditorTabBar/)
    expect(chromeBlock).not.toMatch(/ViewMode/)
    expect(readSrc('src/components/FormatToolbar.vue')).toMatch(/ViewModeDropdown/)
  })

  it('无打开笔记时不应展示 chrome 行', () => {
    expect(app).toMatch(
      /v-if="hasOpenTabs\s*&&\s*viewMode\s*!==\s*'focus'"[\s\S]*?workspace-chrome-bar/,
    )
  })

  it('chrome 行应为单行 flex', () => {
    expect(css).toMatch(/\.workspace-chrome-bar[\s\S]*?display:\s*flex/)
  })

  it('FormatToolbar 应压缩垂直高度（min-height ≤ 40px）', () => {
    const block = css.match(/\.editor-toolbar\s*\{[^}]*\}/)?.[0] ?? ''
    expect(block).toMatch(/min-height:\s*(\d+)px/)
    const minH = Number(block.match(/min-height:\s*(\d+)px/)?.[1] ?? 999)
    expect(minH).toBeLessThanOrEqual(40)
  })
})

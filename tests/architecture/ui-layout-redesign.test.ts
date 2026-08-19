/**
 * UI 布局复刻架构约束（docs/plans/UI布局复刻方案.md）
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')

function readSrc(rel: string) {
  return readFileSync(resolve(root, rel), 'utf-8')
}

describe('Design Token', () => {
  const css = readSrc('src/style.css')

  it('浅色主题主色应为 #5243E8', () => {
    expect(css).toMatch(/:root\s*\{[^}]*--primary:\s*#5243E8/i)
  })

  it('浅色主题背景应为 #f8f9fa', () => {
    expect(css).toMatch(/:root\s*\{[^}]*--bg:\s*#f8f9fa/i)
  })

  it('应声明更适合宽屏的内容区最大宽度与横向边距', () => {
    expect(css).toMatch(/--content-max:\s*1040px/)
    expect(css).toMatch(/--content-max-focus:\s*960px/)
    expect(css).toMatch(/--content-pad-x:\s*24px/)
  })

  it('应声明侧栏默认宽度 260px', () => {
    expect(css).toMatch(/--sidebar-width:\s*260px/)
  })

  it('UI 字体栈应优先 Inter', () => {
    expect(css).toMatch(/--font-ui:\s*['"]?Inter['"]?/)
  })
})

describe('壳层布局 DOM', () => {
  const appSrc = readSrc('src/App.vue')
  const toolbarSrc = readSrc('src/components/Toolbar.vue')

  it('模式切换应使用工具栏下拉，而非 Toolbar 顶栏', () => {
    expect(appSrc).toMatch(/:view-mode="viewMode"/)
    expect(readSrc('src/components/FormatToolbar.vue')).toMatch(/ViewModeDropdown/)
    expect(toolbarSrc).not.toMatch(/view-mode-switcher|ViewModeDropdown|ViewModeHoverPanel/)
  })

  it('编辑舞台应使用 editor-stage 包裹编辑/预览区', () => {
    expect(appSrc).toMatch(/class="editor-stage"/)
  })

  it('侧栏应展示 MarkFlow Logo，顶栏不再放 Logo 与新建主按钮', () => {
    const brandSrc = readSrc('src/components/sidebar/SidebarBrand.vue')
    expect(brandSrc).toMatch(/MarkFlow/)
    expect(toolbarSrc).not.toMatch(/class="app-logo"/)
    expect(toolbarSrc).not.toMatch(/aria-label=["']新建笔记["']/)
    expect(toolbarSrc).not.toMatch(/btn-action-label/)
  })

  it('顶栏应有居中搜索条', () => {
    expect(toolbarSrc).toMatch(/data-testid=["']toolbar-search-bar["']/)
    expect(toolbarSrc).toMatch(/SEARCH_DOCUMENTS_LABEL|搜索文档/)
    expect(toolbarSrc).not.toMatch(/搜索笔记/)
  })

  it('顶栏不应再提供主题快捷切换入口（主题仅在设置面板）', () => {
    expect(toolbarSrc).not.toMatch(/title=["']切换主题["']/)
    expect(toolbarSrc).not.toMatch(/aria-label=["']切换主题["']/)
    expect(toolbarSrc).not.toMatch(/toggleTheme/)
  })
})

describe('内容区留白样式', () => {
  const css = readSrc('src/style.css')

  it('live 模式 editor-stage 应限制最大宽度并水平居中', () => {
    expect(css).toMatch(/\.mode-live \.editor-stage[\s\S]*?max-width:\s*var\(--content-max\)/)
    expect(css).toMatch(/\.editor-stage[\s\S]*?margin(?:-left|-right|):\s*0\s+auto|margin:\s*0\s+auto/)
  })

  it('分屏/源码模式不应被 content-max 限制舞台宽度', () => {
    const baseBlock = css.match(/\.editor-stage\s*\{[^}]*\}/)?.[0] ?? ''
    expect(baseBlock).not.toMatch(/max-width:\s*var\(--content-max\)/)
      
    // Check combined mode-split and mode-source selector
    const splitModeMatch = css.match(/\.mode-split \.(?:editor-stage)[\s\S]{0,150}?max-width/)
    const sourceModeMatch = css.match(/\.mode-source \.(?:editor-stage)[\s\S]{0,150}?max-width/)
      
    // Should not have max-width in mode-split or mode-source
    if (splitModeMatch) {
      expect(splitModeMatch[0]).not.toMatch(/max-width:\s*var\(--content-max\)/)
    }
    if (sourceModeMatch) {
      expect(sourceModeMatch[0]).not.toMatch(/max-width:\s*var\(--content-max\)/)
    }
  })

  it('专注模式内容宽应使用独立的 focus 最大宽度', () => {
    expect(css).toMatch(/\.mode-focus \.wysiwyg-pane[\s\S]*?max-width:\s*var\(--content-max-focus\)/)
    expect(css).not.toMatch(/\.mode-focus \.wysiwyg-pane[\s\S]*?max-width:\s*800px/)
  })

  it('正文和预览应共享内容内边距语义，避免重复扩大留白', () => {
    expect(css).toMatch(/\.preview-content\s*\{[\s\S]*padding:\s*var\(--content-pad-y\)\s+var\(--content-pad-x\)/)
    expect(css).toMatch(/\.ProseMirror,\s*\n\.milkdown \.editor\s*\{[\s\S]*padding:\s*var\(--content-pad-y\)\s+var\(--content-pad-x\)/)
  })

  it('窄窗口应收缩内容横向边距', () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*1100px\)[\s\S]*--content-pad-x:\s*20px/)
    expect(css).toMatch(/@media\s*\(max-width:\s*720px\)[\s\S]*--content-pad-x:\s*16px/)
  })
})

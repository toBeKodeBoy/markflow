/**
 * 首页 / 侧栏留白约束：只锁间距与层级，不改信息架构。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')

function readSrc(rel: string) {
  return readFileSync(resolve(root, rel), 'utf-8')
}

describe('首页留白', () => {
  const css = readSrc('src/style.css')
  const home = readSrc('src/components/EmptyHome.vue')

  it('首页应为 Logo + 命令列表，避免所有区块共用 12px 缝', () => {
    expect(home).toMatch(/class="empty-home-brand"/)
    expect(home).toMatch(/data-testid="empty-home-commands"/)
    expect(home).toMatch(/empty-home-create/)
    expect(home).not.toMatch(/知识库/)
    expect(home).not.toMatch(/empty-home-templates/)
  })

  it('空态画布铺满区域 2，M 绝对居中，命令行在标记下方', () => {
    expect(css).toMatch(/\.empty-tabs-state\s*\{[^}]*position:\s*relative/)
    expect(css).toMatch(/\.empty-tabs-state\s*\{[^}]*overflow-y:\s*auto/)
    expect(css).toMatch(/\.empty-tabs-state\s*\{[^}]*background:\s*var\(--bg-editor\)/)
    expect(css).not.toMatch(/\.empty-tabs-state\s*\{[^}]*radial-gradient/)
    expect(css).toMatch(/\.empty-home-mark\s*\{[^}]*width:\s*280px/)
    expect(css).toMatch(/\.empty-home-mark\s*\{[^}]*height:\s*280px/)
    expect(css).toMatch(/\.empty-home-brand\s*\{[^}]*position:\s*absolute/)
    expect(css).toMatch(/\.empty-home-brand\s*\{[^}]*top:\s*50%/)
    expect(css).toMatch(/\.empty-home-commands\s*\{[^}]*position:\s*absolute/)
    expect(css).toMatch(/\.empty-home-commands\s*\{[^}]*top:\s*calc\(\s*50%\s*\+\s*172px\s*\)/)
    expect(css).toMatch(/\.editor-stage:has\(\.empty-tabs-state\)[\s\S]{0,180}?max-width:\s*none/)
    expect(css).toMatch(/\.editor-stage:has\(\.empty-tabs-state\)[\s\S]{0,180}?padding:\s*0/)
  })

  it('三行命令应纵向排列且左右对齐文案与按键', () => {
    expect(css).toMatch(/\.empty-home-commands\s*\{[^}]*flex-direction:\s*column/)
    expect(css).toMatch(/\.empty-home-command\s*\{[^}]*justify-content:\s*space-between/)
    expect(css).toMatch(/\.empty-home-command\s*\{[^}]*background:\s*transparent/)
  })

  it('窄窗不得把命令改成模板网格', () => {
    expect(home).not.toMatch(/empty-home-template-grid/)
    expect(css).not.toMatch(
      /@media\s*\(max-width:\s*900px\)[\s\S]*?\.empty-home-template-grid[\s\S]*?repeat\([23]/,
    )
  })

  it('首页不再渲染侧栏管理提示句与三条 hint', () => {
    expect(home).not.toMatch(/EMPTY_HOME_SIDEBAR_HINT/)
    expect(home).not.toMatch(/侧边栏可管理所有文件夹与笔记/)
    expect(home).not.toMatch(/empty-home-hints/)
  })
})

describe('侧栏留白', () => {
  const brand = readSrc('src/components/sidebar/SidebarBrand.vue')
  const nav = readSrc('src/components/sidebar/SidebarNav.vue')
  const spaces = readSrc('src/components/sidebar/SidebarSpaces.vue')
  const footer = readSrc('src/components/sidebar/SidebarFooter.vue')
  const sidebar = readSrc('src/components/Sidebar.vue')
  const css = readSrc('src/style.css')
  const icons = readSrc('src/components/AppIcon.vue')

  it('侧栏默认宽度仍为 260px，不靠加宽来换留白', () => {
    expect(css).toMatch(/--sidebar-width:\s*260px/)
    expect(css).toMatch(/\.sidebar\s*\{[^}]*width:\s*260px/)
    expect(css).not.toMatch(/\.sidebar\s*\{[^}]*width:\s*240px/)
  })

  it('应声明侧栏间距 token（中间档：再小两圈）', () => {
    expect(css).toMatch(/--sidebar-pad-x:\s*12px/)
    expect(css).toMatch(/--sidebar-section-y:\s*8px/)
    expect(css).toMatch(/--sidebar-item-gap:\s*4px/)
    expect(css).toMatch(/--sidebar-item-py:\s*7px/)
    expect(css).toMatch(/--sidebar-item-radius:\s*8px/)
    expect(css).toMatch(/--sidebar-create-h:\s*36px/)
    expect(css).toMatch(/--sidebar-space-gap:\s*2px/)
  })

  it('Brand / Nav / Spaces / Footer 应消费间距 token，避免再写死行高', () => {
    expect(brand).toMatch(/padding:\s*14px\s+var\(--sidebar-pad-x\)\s+10px/)
    expect(brand).toMatch(/gap:\s*10px/)
    expect(brand).toMatch(/height:\s*var\(--sidebar-create-h\)/)
    expect(brand).toMatch(/border-radius:\s*var\(--sidebar-item-radius\)/)
    expect(nav).toMatch(/gap:\s*var\(--sidebar-item-gap\)/)
    expect(nav).toMatch(/padding:\s*2px\s+8px\s+8px/)
    expect(nav).toMatch(/padding:\s*var\(--sidebar-item-py\)\s+var\(--sidebar-pad-x\)/)
    expect(nav).toMatch(/border-radius:\s*var\(--sidebar-item-radius\)/)
    expect(spaces).toMatch(/gap:\s*var\(--sidebar-space-gap\)/)
    expect(spaces).toMatch(/padding:\s*var\(--sidebar-section-y\)\s+8px/)
    expect(spaces).toMatch(/\.sidebar-spaces-header[\s\S]*?padding:\s*4px\s+var\(--sidebar-pad-x\)\s+2px/)
    expect(spaces).toMatch(/\.sidebar-space-select[\s\S]*?padding:\s*var\(--sidebar-item-py\)\s+var\(--sidebar-pad-x\)/)
    expect(footer).toMatch(/\.sidebar-footer\s*\{[^}]*padding:\s*var\(--sidebar-section-y\)/)
    expect(footer).toMatch(/padding:\s*var\(--sidebar-item-py\)\s+var\(--sidebar-pad-x\)/)
  })

  it('树节点垂直 padding 应与导航对齐', () => {
    expect(css).toMatch(/\.folder-item\s*\{[^}]*padding:\s*8px\s+12px/)
  })

  it('导航与设置应使用 AppIcon，且提供 home', () => {
    expect(nav).toMatch(/name=["']home["']/)
    expect(nav).toMatch(/name=["']file["']/)
    expect(nav).toMatch(/name=["']trash["']/)
    expect(footer).toMatch(/name=["']settings["']/)
    expect(footer).toMatch(/name=["']help["']/)
    expect(icons).toMatch(/name === 'home'/)
    expect(icons).toMatch(/\| 'home'/)
  })

  it('导航选中态不得使用 inset 竖条', () => {
    expect(nav).not.toMatch(/inset\s+2px/)
  })

  it('侧栏不得再出现批量折叠 / 展开工具条', () => {
    expect(sidebar).not.toMatch(/sidebar-toolbar/)
    expect(sidebar).not.toMatch(/展开1级/)
    expect(sidebar).not.toMatch(/展开2级/)
    expect(sidebar).not.toMatch(/>折叠</)
    expect(sidebar).not.toMatch(/collapseAllFolders|cycleExpandLevel|expandLevelCycle/)
  })

  it('侧栏导航文案仍不得出现知识库或标签', () => {
    expect(nav).not.toMatch(/知识库/)
    expect(nav).not.toMatch(/标签/)
    expect(brand).not.toMatch(/知识库/)
  })
})

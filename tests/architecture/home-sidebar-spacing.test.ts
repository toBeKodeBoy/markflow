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

  it('首页应分组为 hero 与模板，避免所有区块共用 12px 缝', () => {
    expect(home).toMatch(/class="empty-home-hero"/)
    expect(home).toMatch(/data-testid="empty-home-templates"/)
    expect(home).toMatch(/empty-home-create/)
    expect(home).not.toMatch(/知识库/)
  })

  it('首页内边距与标题应拉开', () => {
    expect(css).toMatch(/\.empty-tabs-state\s*\{[^}]*padding:\s*48px\s+40px\s+56px/)
    expect(css).toMatch(/\.empty-tabs-state\s*\{[^}]*gap:\s*40px/)
    expect(css).toMatch(/\.empty-tabs-title\s*\{[^}]*font-size:\s*28px/)
    expect(css).toMatch(/\.empty-home-hero\s*\{[^}]*gap:\s*12px/)
  })

  it('模板区应更宽、卡片间距与内边距更大', () => {
    expect(css).toMatch(/\.empty-home-templates\s*\{[^}]*width:\s*min\(920px,\s*100%\)/)
    expect(css).toMatch(/\.empty-home-template-grid\s*\{[^}]*gap:\s*20px/)
    expect(css).toMatch(/\.empty-home-template-card\s*\{[^}]*padding:\s*20px/)
    expect(css).toMatch(/\.empty-home-template-card\s*\{[^}]*min-height:\s*160px/)
    expect(css).toMatch(/\.empty-home-template-icon\s*\{[^}]*width:\s*36px/)
    expect(css).toMatch(/\.empty-home-templates-title\s*\{[^}]*margin:\s*0\s+0\s+16px/)
  })

  it('首页操作按钮应为更高的胶囊形', () => {
    expect(css).toMatch(/\.empty-tabs-actions[\s\S]*?min-height:\s*40px/)
    expect(css).toMatch(/\.empty-tabs-actions[\s\S]*?border-radius:\s*999px/)
  })

  it('窄窗应收缩首页边距，说明最多两行以免撑破网格', () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*720px\)[\s\S]*\.empty-tabs-state[\s\S]*?padding:\s*32px\s+16px\s+40px/)
    expect(css).toMatch(/\.empty-home-template-desc[\s\S]*?-webkit-line-clamp:\s*2/)
    expect(home).toMatch(/empty-home-template-desc/)
  })

  it('首页不再渲染侧栏管理提示句', () => {
    expect(home).not.toMatch(/EMPTY_HOME_SIDEBAR_HINT/)
    expect(home).not.toMatch(/侧边栏可管理所有文件夹与笔记/)
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
    expect(spaces).toMatch(/\.sidebar-space-item[\s\S]*?padding:\s*var\(--sidebar-item-py\)\s+var\(--sidebar-pad-x\)/)
    expect(footer).toMatch(/\.sidebar-footer\s*\{[^}]*padding:\s*var\(--sidebar-section-y\)/)
    expect(footer).toMatch(/padding:\s*var\(--sidebar-item-py\)\s+var\(--sidebar-pad-x\)/)
  })

  it('树节点垂直 padding 应与导航对齐，行高保持 42', () => {
    expect(css).toMatch(/\.folder-item\s*\{[^}]*padding:\s*8px\s+12px/)
    expect(sidebar).toMatch(/SIDEBAR_ROW_HEIGHT = 42/)
  })

  it('导航与设置应使用 AppIcon，且提供 home', () => {
    expect(nav).toMatch(/name=["']home["']/)
    expect(nav).toMatch(/name=["']file["']/)
    expect(nav).toMatch(/name=["']trash["']/)
    expect(footer).toMatch(/name=["']settings["']/)
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

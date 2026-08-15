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
  })

  it('模板区应更宽、卡片间距与内边距更大', () => {
    expect(css).toMatch(/\.empty-home-templates\s*\{[^}]*width:\s*min\(920px,\s*100%\)/)
    expect(css).toMatch(/\.empty-home-template-grid\s*\{[^}]*gap:\s*16px/)
    expect(css).toMatch(/\.empty-home-template-card\s*\{[^}]*padding:\s*16px\s+16px\s+18px/)
    expect(css).toMatch(/\.empty-home-template-card\s*\{[^}]*min-height:\s*148px/)
    expect(css).toMatch(/\.empty-home-template-icon\s*\{[^}]*width:\s*36px/)
  })

  it('窄窗应收缩首页边距，说明最多两行以免撑破网格', () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*720px\)[\s\S]*\.empty-tabs-state[\s\S]*?padding:\s*32px\s+16px\s+40px/)
    expect(css).toMatch(/\.empty-home-template-desc[\s\S]*?-webkit-line-clamp:\s*2/)
    expect(home).toMatch(/empty-home-template-desc/)
  })
})

describe('侧栏留白', () => {
  const brand = readSrc('src/components/sidebar/SidebarBrand.vue')
  const nav = readSrc('src/components/sidebar/SidebarNav.vue')
  const spaces = readSrc('src/components/sidebar/SidebarSpaces.vue')
  const css = readSrc('src/style.css')

  it('侧栏默认宽度仍为 260px，不靠加宽来换留白', () => {
    expect(css).toMatch(/--sidebar-width:\s*260px/)
  })

  it('Brand 与新建按钮应增高', () => {
    expect(brand).toMatch(/padding:\s*16px\s+12px\s+12px/)
    expect(brand).toMatch(/height:\s*40px/)
  })

  it('导航项与空间行应增加行高和段间距', () => {
    expect(nav).toMatch(/gap:\s*4px/)
    expect(nav).toMatch(/padding:\s*9px\s+12px/)
    expect(spaces).toMatch(/\.sidebar-space-item[\s\S]*?padding:\s*8px\s+12px/)
  })

  it('侧栏导航文案仍不得出现知识库或标签', () => {
    expect(nav).not.toMatch(/知识库/)
    expect(nav).not.toMatch(/标签/)
    expect(brand).not.toMatch(/知识库/)
  })
})

/**
 * P0 视觉约束：不改信息架构，只锁首页质感、侧栏完成度与顶栏。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')

function readSrc(rel: string) {
  return readFileSync(resolve(root, rel), 'utf-8')
}

describe('P0 首页视觉', () => {
  const css = readSrc('src/style.css')
  const home = readSrc('src/components/EmptyHome.vue')
  const copy = readSrc('src/constants/emptyHomeCopy.ts')
  const templates = readSrc('src/constants/noteTemplates.ts')

  it('欢迎标题应为展示级 32px，且不得出现知识库', () => {
    expect(css).toMatch(/\.empty-tabs-title\s*\{[^}]*font-size:\s*32px/)
    expect(home).not.toMatch(/知识库/)
    expect(copy).not.toMatch(/知识库/)
  })

  it('三个主操作按钮应带图标，且第三颗仍是导入 .md', () => {
    expect(home).toMatch(/data-testid="empty-home-create"[\s\S]*?AppIcon name="plus"/)
    expect(home).toMatch(/data-testid="empty-home-create-folder"[\s\S]*?AppIcon name="folder"/)
    expect(home).toMatch(/data-testid="empty-home-import"[\s\S]*?AppIcon name="upload"/)
    expect(copy).toMatch(/EMPTY_HOME_IMPORT_LABEL = '导入 \.md'/)
    expect(home).not.toMatch(/新建知识库/)
  })

  it('模板卡应是展示级：大图标、色边、独立一键创建样式', () => {
    expect(css).toMatch(/\.empty-home-template-card\s*\{[^}]*min-height:\s*180px/)
    expect(css).toMatch(/\.empty-home-template-icon\s*\{[^}]*width:\s*48px/)
    expect(css).toMatch(/\.empty-home-template-icon\s*\{[^}]*height:\s*48px/)
    expect(css).toMatch(/\.empty-home-template-cta\s*\{/)
    expect(home).toMatch(/class="empty-home-template-cta"/)
    expect(home).toMatch(/一键创建/)
    expect(css).toMatch(/\.empty-home-template-card\.tone-blue/)
  })

  it('模板描述应写满两行用途，而不是短标签', () => {
    expect(templates).toMatch(/接口说明、故障排查与协作文档模板/)
    expect(templates).toMatch(/知识点清单、复习提纲，适合每天学完整理/)
    expect(templates).toMatch(/工作计划、随手记录，晚上再复盘整理/)
    expect(templates).toMatch(/可复用的 AI 提示模板，保持语气简洁/)
  })

  it('空库首页只保留导入示例链接，不再渲染三条 hint', () => {
    expect(home).not.toMatch(/empty-home-hints/)
    expect(home).not.toMatch(/EMPTY_HOME_HINT_/)
    expect(copy).not.toMatch(/EMPTY_HOME_HINT_/)
    expect(home).toMatch(/data-testid="empty-home-example-library"/)
    expect(home).toMatch(/AppIcon name="download"/)
    expect(copy).toMatch(/EMPTY_HOME_EXAMPLE_LIBRARY_LABEL = '导入示例笔记'/)
    expect(copy).not.toMatch(/示例知识库/)
  })
})

describe('P0 侧栏视觉', () => {
  const brand = readSrc('src/components/sidebar/SidebarBrand.vue')
  const spaces = readSrc('src/components/sidebar/SidebarSpaces.vue')
  const footer = readSrc('src/components/sidebar/SidebarFooter.vue')
  const copy = readSrc('src/constants/sidebarShell.ts')
  const icons = readSrc('src/components/AppIcon.vue')

  it('品牌应为色块 M 标，新建文档带加号', () => {
    expect(brand).toMatch(/class="logo-mark"/)
    expect(brand).not.toMatch(/M↓/)
    expect(brand).toMatch(/AppIcon name="plus"/)
    expect(brand).toMatch(/height:\s*var\(--sidebar-create-h\)/)
  })

  it('空间行应有文件夹图标', () => {
    expect(spaces).toMatch(/AppIcon name="folder"/)
    expect(spaces).toMatch(/data-testid="sidebar-space-my"/)
  })

  it('底栏应是设置 + 帮助与反馈的图标文字项', () => {
    expect(copy).toMatch(/SIDEBAR_HELP_LABEL = '帮助与反馈'/)
    expect(footer).toMatch(/data-testid="sidebar-settings"/)
    expect(footer).toMatch(/data-testid="sidebar-help"/)
    expect(footer).toMatch(/name=["']settings["']/)
    expect(footer).toMatch(/name=["']help["']/)
    expect(footer).toMatch(/SIDEBAR_SETTINGS_LABEL/)
    expect(footer).toMatch(/SIDEBAR_HELP_LABEL/)
    expect(footer).not.toMatch(/sidebar-storage-caption/)
  })

  it('AppIcon 应提供 upload / download / help', () => {
    expect(icons).toMatch(/name === 'upload'/)
    expect(icons).toMatch(/name === 'download'/)
    expect(icons).toMatch(/name === 'help'/)
    expect(icons).toMatch(/\| 'upload'/)
    expect(icons).toMatch(/\| 'download'/)
    expect(icons).toMatch(/\| 'help'/)
  })
})

describe('P0 顶栏视觉', () => {
  const css = readSrc('src/style.css')
  const toolbar = readSrc('src/components/Toolbar.vue')
  const app = readSrc('src/App.vue')

  it('搜索条应加宽，可见文案为搜索文档', () => {
    expect(css).toMatch(/\.topbar-center\s*\{[^}]*flex:\s*0 1 440px/)
    expect(css).toMatch(/\.toolbar-search-bar\s*\{[^}]*width:\s*min\(\s*100%,\s*440px\s*\)/)
    expect(toolbar).toMatch(/>搜索文档</)
    expect(toolbar).toMatch(/aria-label=["']搜索笔记["']/)
  })

  it('首页应隐藏目录按钮，仅编辑视图传入 tocAvailable', () => {
    expect(toolbar).toMatch(/tocAvailable/)
    expect(toolbar).toMatch(/v-if="tocAvailable"/)
    expect(app).toMatch(/:toc-available="isEditorView"|:tocAvailable="isEditorView"/)
  })
})

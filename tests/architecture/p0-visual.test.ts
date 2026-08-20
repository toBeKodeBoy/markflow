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

  it('首页不得出现知识库，主视觉是淡 Logo', () => {
    expect(home).not.toMatch(/知识库/)
    expect(copy).not.toMatch(/知识库/)
    expect(home).toMatch(/data-testid="empty-home-mark"/)
    expect(css).toMatch(/\.empty-home-mark\s*\{/)
    expect(home).not.toMatch(/新建知识库/)
  })

  it('三行命令应为无边框行，右对齐按键，而不是胶囊主按钮', () => {
    expect(home).toMatch(/data-testid="empty-home-create"/)
    expect(home).toMatch(/data-testid="empty-home-search"/)
    expect(home).toMatch(/data-testid="empty-home-settings"/)
    expect(home).toMatch(/<kbd>/)
    expect(css).toMatch(/\.empty-home-command\s*\{[^}]*justify-content:\s*space-between/)
    expect(css).toMatch(/\.empty-home-commands\s*\{/)
    expect(home).not.toMatch(/empty-home-import/)
    expect(home).not.toMatch(/empty-home-create-folder/)
  })

  it('创建弹窗模板描述应写满两行用途，而不是短标签', () => {
    expect(templates).toMatch(/接口说明、故障排查与协作文档模板/)
    expect(templates).toMatch(/知识点清单、复习提纲，适合每天学完整理/)
    expect(templates).toMatch(/工作计划、随手记录，晚上再复盘整理/)
    expect(templates).toMatch(/可复用的 AI 提示模板，保持语气简洁/)
  })

  it('首页不再渲染模板卡、示例导入与 hint', () => {
    expect(home).not.toMatch(/empty-home-hints/)
    expect(home).not.toMatch(/EMPTY_HOME_HINT_/)
    expect(copy).not.toMatch(/EMPTY_HOME_HINT_/)
    expect(home).not.toMatch(/empty-home-templates/)
    expect(home).not.toMatch(/empty-home-example-library/)
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

  it('搜索条应加宽，可见文案与 aria 均为搜索文档', () => {
    expect(css).toMatch(/\.topbar-center\s*\{[^}]*flex:\s*0 1 440px/)
    expect(css).toMatch(/\.toolbar-search-bar\s*\{[^}]*width:\s*min\(\s*100%,\s*440px\s*\)/)
    expect(toolbar).toMatch(/SEARCH_DOCUMENTS_LABEL/)
    expect(toolbar).not.toMatch(/搜索笔记/)
  })

  it('浅色顶栏只比画布深约 1%，搜索条再浅一档；深色 token 保持现状', () => {
    expect(css).toMatch(/:root\s*\{[^}]*--bg-toolbar:\s*#fcfcfd/i)
    expect(css).toMatch(/:root\s*\{[^}]*--bg-editor:\s*#ffffff/i)
    expect(css).toMatch(/:root\s*\{[^}]*--bg-search:\s*#fefefe/i)
    expect(css).toMatch(/\[data-theme="dark"\]\s*\{[^}]*--bg-toolbar:\s*#181825/i)
    expect(css).toMatch(/\[data-theme="dark"\]\s*\{[^}]*--bg-editor:\s*#1e1e2e/i)
    expect(css).toMatch(/\[data-theme="dark"\]\s*\{[^}]*--bg-search:\s*#2a2a3e/i)
    expect(css).toMatch(/\.toolbar-search-bar\s*\{[^}]*background:\s*var\(--bg-search\)/)
    expect(css).toMatch(/\.topbar\s*\{[^}]*background:\s*var\(--bg-toolbar\)/)
    expect(css).toMatch(/\.status-bar\s*\{[^}]*background:\s*var\(--bg-toolbar\)/)
  })

  it('首页应隐藏目录按钮，仅编辑视图传入 tocAvailable', () => {
    expect(toolbar).toMatch(/tocAvailable/)
    expect(toolbar).toMatch(/v-if="tocAvailable"/)
    expect(app).toMatch(/:toc-available="isEditorView"|:tocAvailable="isEditorView"/)
  })
})

describe('D3 文档用词', () => {
  it('Toolbar 搜索控件与 SearchModal 不得出现「搜索笔记」', () => {
    const shell = readSrc('src/constants/sidebarShell.ts')
    const toolbar = readSrc('src/components/Toolbar.vue')
    const searchModal = readSrc('src/components/SearchModal.vue')
    expect(shell).toMatch(/SEARCH_DOCUMENTS_LABEL = '搜索文档'/)
    expect(shell).toMatch(/SEARCH_DOCUMENTS_PLACEHOLDER = '搜索文档标题或正文\.\.\.'/)
    expect(toolbar).not.toMatch(/搜索笔记/)
    expect(searchModal).not.toMatch(/搜索笔记/)
    expect(toolbar).toMatch(/SEARCH_DOCUMENTS_LABEL/)
    expect(searchModal).toMatch(/SEARCH_DOCUMENTS_LABEL/)
    expect(searchModal).toMatch(/SEARCH_DOCUMENTS_PLACEHOLDER/)
  })
})

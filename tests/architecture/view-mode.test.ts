/**
 * 四视图模式架构约束
 * @file tests/architecture/view-mode.test.ts
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')

function readSrc(rel: string) {
  return readFileSync(resolve(root, rel), 'utf-8')
}

describe('ViewMode 类型', () => {
  it('应在 types/index.ts 导出四种模式', () => {
    const src = readSrc('src/types/index.ts')
    expect(src).toMatch(/export type ViewMode = 'live' \| 'split' \| 'source' \| 'focus'/)
  })

  it('App.vue 与 Toolbar.vue 应引用共享 ViewMode', () => {
    expect(readSrc('src/App.vue')).toMatch(/import type \{ ViewMode \} from '\.\/types'/)
    expect(readSrc('src/components/Toolbar.vue')).toMatch(
      /import type \{ AppSettings, ImportFolderScanResult, PdfExportOptions, ViewMode \} from '\.\.\/types'/
    )
  })
})

describe('App.vue 视图调度', () => {
  const appSrc = readSrc('src/App.vue')

  it('WYSIWYG 用于 live 与 focus（多 Tab v-for）', () => {
    expect(appSrc).toMatch(/viewMode === 'live' \|\| viewMode === 'focus'/)
    expect(appSrc).toMatch(/<WysiwygEditor/)
    expect(appSrc).toMatch(/:focusMode="viewMode === 'focus'"/)
    expect(appSrc).toMatch(/:note-id="tab\.noteId"/)
  })

  it('CodeMirror 用于 split 与 source，Preview 仅 split', () => {
    expect(appSrc).toMatch(/<template v-else>/)
    expect(appSrc).toMatch(/<Editor[^>]*:note-id="tab\.noteId"/)
    expect(appSrc).toMatch(/<Preview v-if="viewMode === 'split'"[^>]*\/>/)
  })

  it('专注模式隐藏侧边栏与目录', () => {
    expect(appSrc).toMatch(/viewMode\.value !== 'focus' && sidebarVisible/)
    expect(appSrc).toMatch(/tocVisible && viewMode !== 'focus'/)
  })

  it('setViewMode 切换前应 flush 当前 Tab', () => {
    expect(appSrc).toMatch(/tabsStore\.flushActiveTab\(\)/)
  })

  it('进入 focus 时记录 prevMode', () => {
    expect(appSrc).toMatch(/if \(mode === 'focus'\) prevMode\.value = viewMode\.value/)
    expect(appSrc).toMatch(/viewMode\.value = prevMode\.value/)
  })

  it('大文件在 live/focus 时自动切分屏', () => {
    expect(appSrc).toMatch(/store\.pendingLargeFileSwitch/)
    expect(appSrc).toMatch(/viewMode\.value === 'live' \|\| viewMode\.value === 'focus'/)
    expect(appSrc).toMatch(/setViewMode\('split'\)/)
  })
})

describe('编辑器卸载 flush', () => {
  it('Editor 按 noteId 初始化，卸载时 flush', () => {
    const src = readSrc('src/components/Editor.vue')
    expect(src).toMatch(/noteId:\s*string/)
    expect(src).toMatch(/tabsStore\.tabs\.find\(\(t\) => t\.noteId === props\.noteId\)/)
    expect(src).toMatch(/store\.updateNoteContent\(props\.noteId, content\)/)
  })

  it('WysiwygEditor 卸载时 flush markdown', () => {
    const src = readSrc('src/components/WysiwygEditor.vue')
    expect(src).toMatch(/getMarkdown\(\)\(ctx\)/)
    expect(src).toMatch(/store\.updateNoteContent\(props\.noteId, persisted\)/)
  })
})

describe('视图模式样式', () => {
  const css = readSrc('src/style.css')

  it('topbar 使用 grid 布局避免模式按钮被左右区域遮挡', () => {
    expect(css).toMatch(/\.topbar[\s\S]*?grid-template-columns:\s*1fr auto 1fr/)
    expect(css).toMatch(/\.topbar-center[\s\S]*?justify-self:\s*center/)
  })

  it('不应使用无效的 sidebar-pane 选择器', () => {
    expect(css).not.toMatch(/\.sidebar-pane/)
  })

  it('专注模式样式作用于 wysiwyg-pane', () => {
    expect(css).toMatch(/\.mode-focus \.wysiwyg-pane/)
  })

  it('专注模式浮动工具栏样式', () => {
    expect(css).toMatch(/\.focus-format-toolbar/)
    expect(css).toMatch(/\.focus-format-toolbar\.is-hidden/)
  })

  it('退出专注按钮仅在 focus 模式可见', () => {
    expect(css).toMatch(/\.mode-live \.focus-exit-btn,\s*\n\.mode-split \.focus-exit-btn,\s*\n\.mode-source \.focus-exit-btn/)
    expect(css).not.toMatch(/\.mode-focus \.focus-exit-btn,\s*\n\.mode-source \.focus-exit-btn/)
  })
})

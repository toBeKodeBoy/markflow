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
      /import type \{ (?:PdfExportOptions, )?ViewMode \} from '\.\.\/types'/
    )
  })
})

describe('App.vue 视图调度', () => {
  const appSrc = readSrc('src/App.vue')

  it('WYSIWYG 用于 live 与 focus', () => {
    expect(appSrc).toMatch(/WysiwygEditor v-if="viewMode === 'live' \|\| viewMode === 'focus'"/)
  })

  it('CodeMirror 用于 split 与 source，Preview 仅 split', () => {
    expect(appSrc).toMatch(/<template v-else>/)
    expect(appSrc).toMatch(/<Editor[^>]*\/>/)
    expect(appSrc).toMatch(/<Preview v-if="viewMode === 'split'"[^>]*\/>/)
    expect(appSrc).not.toMatch(/<Editor v-else \/>/)
  })

  it('专注模式隐藏侧边栏与目录', () => {
    expect(appSrc).toMatch(/viewMode\.value !== 'focus' && sidebarVisible/)
    expect(appSrc).toMatch(/tocVisible && viewMode !== 'focus'/)
  })

  it('setViewMode 切换前应 flush liveContent', () => {
    expect(appSrc).toMatch(/store\.updateCurrentContent\(store\.liveContent\)/)
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
  it('Editor 挂载优先 liveContent，卸载时 flush', () => {
    const src = readSrc('src/components/Editor.vue')
    expect(src).toMatch(/initEditor\(store\.liveContent \|\| store\.currentNote\?\.content/)
    expect(src).toMatch(/store\.updateCurrentContent\(content\)/)
  })

  it('WysiwygEditor 卸载时 flush markdown', () => {
    const src = readSrc('src/components/WysiwygEditor.vue')
    expect(src).toMatch(/getMarkdown\(\)\(ctx\)/)
    expect(src).toMatch(/store\.updateCurrentContent\(persisted\)/)
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
})

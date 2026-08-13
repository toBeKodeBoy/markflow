/**
 * 深色模式轻卡片式编辑画布架构约束
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')

function readSrc(rel: string) {
  return readFileSync(resolve(root, rel), 'utf-8')
}

describe('Dark mode editor canvas tokens', () => {
  const css = readSrc('src/style.css')

  it('应定义应用、舞台、画布三层背景变量', () => {
    expect(css).toMatch(/--bg-app:\s*#/)
    expect(css).toMatch(/--bg-stage:\s*#/)
    expect(css).toMatch(/--bg-canvas:\s*#/)
  })

  it('应定义轻卡片边界所需的弱描边与轻阴影变量', () => {
    expect(css).toMatch(/--border-subtle:\s*.+;/)
    expect(css).toMatch(/--canvas-shadow:\s*.+;/)
  })

  it('深色主题下应覆盖画布层变量', () => {
    expect(css).toMatch(/\[data-theme="dark"\]\s*\{[\s\S]*--bg-app:\s*#[0-9a-f]{6}/i)
    expect(css).toMatch(/\[data-theme="dark"\]\s*\{[\s\S]*--bg-stage:\s*#[0-9a-f]{6}/i)
    expect(css).toMatch(/\[data-theme="dark"\]\s*\{[\s\S]*--bg-canvas:\s*#[0-9a-f]{6}/i)
  })
})

describe('Dark mode editor canvas structure', () => {
  const css = readSrc('src/style.css')
  const editorSrc = readSrc('src/components/Editor.vue')
  const wysiwygSrc = readSrc('src/components/WysiwygEditor.vue')
  const previewSrc = readSrc('src/components/Preview.vue')

  it('主工作区应区分应用背景层与舞台背景层', () => {
    expect(css).toMatch(/\.app\s*\{[\s\S]*background:\s*var\(--bg-app\)/)
    expect(css).toMatch(/\.workspace-main\s*\{[\s\S]*background:\s*var\(--bg-stage\)/)
    expect(css).toMatch(/\.workspace-editor-row\s*\{[\s\S]*background:\s*var\(--bg-stage\)/)
  })

  it('应声明统一 editor-canvas 容器类承载画布层', () => {
    expect(css).toMatch(/\.editor-canvas\s*\{[\s\S]*background:\s*var\(--bg-canvas\)/)
    expect(css).toMatch(/\.editor-canvas\s*\{[\s\S]*border:\s*1px solid var\(--border-subtle\)/)
    expect(css).toMatch(/\.editor-canvas\s*\{[\s\S]*box-shadow:\s*var\(--canvas-shadow\)/)
  })

  it('源码编辑器、WYSIWYG、预览区都应接入统一画布容器类', () => {
    expect(editorSrc).toMatch(/class="editor-pane editor-canvas"/)
    expect(wysiwygSrc).toMatch(/class="editor-pane wysiwyg-pane editor-canvas"/)
    expect(previewSrc).toMatch(/class="preview-pane editor-canvas"/)
  })

  it('编辑器内核宿主应避免重新覆盖画布底色', () => {
    expect(css).toMatch(/\.cm-host\s*\{[\s\S]*background:\s*transparent/)
    expect(css).toMatch(/\.cm-host \.cm-editor\s*\{[\s\S]*background:\s*transparent/)
    expect(css).toMatch(/\.milkdown\s*\{[\s\S]*background:\s*transparent/)
    expect(css).toMatch(/\.milkdown-dark \.ProseMirror[\s\S]*background:\s*transparent/)
  })
})

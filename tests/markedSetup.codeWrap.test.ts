import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseMarkdown } from '../src/utils/markedSetup'

const STYLE_CSS = readFileSync(resolve(__dirname, '../src/style.css'), 'utf-8')

/** 超长单行代码：无空格长 token 远超容器宽度，用于验证自动折行不依赖语言指定 */
const LONG_LINE_CODE = `const veryLongString = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";`

function parseCodeBlockHtml(markdown: string) {
  const html = parseMarkdown(markdown)
  const doc = new DOMParser().parseFromString(`<div class="markdown-body">${html}</div>`, 'text/html')
  return {
    html,
    doc,
    code: doc.querySelector('.code-block-wrapper pre code'),
    langLabel: doc.querySelector('.code-lang-label'),
  }
}

describe('预览代码块渲染（自动折行相关）', () => {
  it('指定语言：渲染结构完整且代码文本无丢失', () => {
    const { code, langLabel } = parseCodeBlockHtml(`\`\`\`js\n${LONG_LINE_CODE}\n\`\`\``)
    expect(code).not.toBeNull()
    expect(code!.classList.contains('hljs')).toBe(true)
    expect(code!.classList.contains('language-js')).toBe(true)
    expect(code!.textContent).toBe(LONG_LINE_CODE)
    expect(langLabel?.textContent).toBe('js')
  })

  it('未指定语言：同样渲染为代码块，代码文本原样保留', () => {
    const { code, langLabel } = parseCodeBlockHtml(`\`\`\`\n${LONG_LINE_CODE}\n\`\`\``)
    expect(code).not.toBeNull()
    expect(code!.classList.contains('hljs')).toBe(true)
    expect([...code!.classList].some((cls) => cls.startsWith('language-'))).toBe(false)
    expect(code!.textContent).toBe(LONG_LINE_CODE)
    expect(langLabel).toBeNull()
  })

  it('mermaid 块不落入普通代码折行规则（仍走图示渲染）', () => {
    const { doc } = parseCodeBlockHtml('```mermaid\ngraph TD\n  A-->B\n```')
    expect(doc.querySelector('.code-block-wrapper pre code')).toBeNull()
    expect(doc.querySelector('.mermaid-diagram-wrapper')).not.toBeNull()
  })
})

describe('代码块折行样式（style.css）', () => {
  it('预览区 .markdown-body pre 自身开启 pre-wrap（避免 pre 按 min-content 撑宽）', () => {
    const preRule = STYLE_CSS.match(/\.markdown-body pre\s*\{[^}]+\}/)?.[0] ?? ''
    expect(preRule).toMatch(/white-space:\s*pre-wrap/)
    expect(preRule).toMatch(/overflow-wrap:\s*anywhere/)
  })

  it('预览区 .markdown-body pre code.hljs 折行并覆盖 hljs 的 overflow-x', () => {
    const previewRule = STYLE_CSS.match(/\.markdown-body pre code\.hljs\s*\{[^}]+\}/)?.[0] ?? ''
    expect(previewRule).toMatch(/white-space:\s*pre-wrap/)
    expect(previewRule).toMatch(/overflow-wrap:\s*anywhere/)
    expect(previewRule).toMatch(/overflow-x:\s*visible/)
  })

  it('live/专注模式 .ProseMirror 代码块同样自动折行（默认视图）', () => {
    const editorRule = STYLE_CSS.match(/\.ProseMirror pre code\s*\{[^}]+\}/)?.[0] ?? ''
    expect(editorRule).toMatch(/white-space:\s*pre-wrap/)
    const layersRule = STYLE_CSS.match(/\.ProseMirror \.code-block-wrapper \.code-block-layers > code\s*\{[^}]+\}/)?.[0] ?? ''
    expect(layersRule).toMatch(/white-space:\s*pre-wrap/)
    expect(layersRule).toMatch(/overflow-wrap:\s*anywhere/)
  })
})

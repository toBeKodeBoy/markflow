import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('WYSIWYG footnote CSS', () => {
  const css = readFileSync(resolve(__dirname, '../../src/style.css'), 'utf-8')

  it('renders footnote references as superscript indexes in ProseMirror', () => {
    const rule = css.match(/\.ProseMirror\s+sup\[data-type="footnote_reference"\]\s*\{[^}]+\}/)?.[0] ?? ''
    const afterRule = css.match(/\.ProseMirror\s+sup\[data-type="footnote_reference"\]::after\s*\{[^}]+\}/)?.[0] ?? ''

    expect(rule).toMatch(/font-size:\s*0/)
    expect(rule).toMatch(/vertical-align:\s*super/)
    expect(afterRule).toMatch(/content:\s*attr\(data-footnote-index\)/)
  })

  it('renders footnote definitions as numbered two-column rows in ProseMirror', () => {
    const dlRule = css.match(/\.ProseMirror\s+dl\[data-type="footnote_definition"\]\s*\{[^}]+\}/)?.[0] ?? ''
    const beforeRule = css.match(/\.ProseMirror\s+dl\[data-type="footnote_definition"\]::before\s*\{[^}]+\}/)?.[0] ?? ''
    const dtRule = css.match(/\.ProseMirror\s+dl\[data-type="footnote_definition"\]\s*>\s*dt\s*\{[^}]+\}/)?.[0] ?? ''
    const ddRule = css.match(/\.ProseMirror\s+dl\[data-type="footnote_definition"\]\s*>\s*dd\s*\{[^}]+\}/)?.[0] ?? ''

    expect(dlRule).toMatch(/display:\s*grid/)
    expect(dlRule).toMatch(/grid-template-columns:\s*(?:minmax\([^)]*\)|[0-9.]+(?:ch|em|rem|px))\s+minmax\(0,\s*1fr\)/)
    expect(dlRule).toMatch(/align-items:\s*baseline/)
    expect(beforeRule).toMatch(/content:\s*attr\(data-footnote-index\)\s*["']\.[^}]*["']?/)
    expect(beforeRule).toMatch(/grid-column:\s*1/)
    expect(dtRule).toMatch(/display:\s*none/)
    expect(ddRule).toMatch(/grid-column:\s*2/)
    expect(css).not.toMatch(/counter-reset:\s*markflow-footnote/)
    expect(css).not.toMatch(/counter-increment:\s*markflow-footnote/)
  })

  it('预览区为脚注引用与脚注列表提供样式', () => {
    expect(css).toMatch(/\.markdown-body\s+sup\.footnote-ref\s*\{/)
    expect(css).toMatch(/\.markdown-body\s+section\.footnotes\s*\{/)
    expect(css).toMatch(/vertical-align:\s*super/)
  })
})

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('WYSIWYG task list CSS', () => {
  const css = readFileSync(resolve(__dirname, '../../src/style.css'), 'utf-8')

  it('hides list markers for task lists in ProseMirror', () => {
    expect(css).toMatch(/\.ProseMirror\s+ul:has\(li\[data-item-type="task"\]\)[\s\S]*list-style:\s*none/)
  })

  it('uses flex layout so checkbox and text stay on one line', () => {
    expect(css).toMatch(/\.ProseMirror\s+li\[data-item-type="task"\][\s\S]*display:\s*flex/)
  })

  it('vertically centers the task marker with the text in WYSIWYG mode', () => {
    const itemRule = css.match(/\.ProseMirror\s+li\[data-item-type="task"\]\s*\{[^}]+\}/)?.[0] ?? ''
    const markerRule = css.match(/\.ProseMirror\s+li\[data-item-type="task"\]::before\s*\{[^}]+\}/)?.[0] ?? ''
    expect(itemRule).toMatch(/align-items:\s*center/)
    expect(markerRule).toMatch(/margin-top:\s*0[;\s}]/)
    expect(markerRule).toMatch(/transform:\s*translateY\(/)
  })

  it('removes paragraph margin inside task list items', () => {
    expect(css).toMatch(/\.ProseMirror\s+li\[data-item-type="task"\]\s*>\s*p[\s\S]*margin:\s*0/)
  })
})

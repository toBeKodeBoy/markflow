import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8')

describe('wysiwyg table styles', () => {
  it('keeps header background on th only and removes even-row zebra stripe in ProseMirror tables', () => {
    expect(css).toContain('.ProseMirror th { background: var(--bg-sidebar); font-weight: 600; }')
    expect(css).not.toContain('.ProseMirror tr:nth-child(even) td { background: var(--bg-sidebar); }')
  })
})

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('inline code CSS', () => {
  const css = readFileSync(resolve(__dirname, '../../src/style.css'), 'utf-8')

  it('styles inline code separately from pre > code blocks', () => {
    expect(css).toMatch(/:not\(pre\)\s*>\s*code/)
  })

  it('ensures inline code displays inline with text', () => {
    expect(css).toMatch(/:not\(pre\)\s*>\s*code[\s\S]*display:\s*inline/)
  })
})

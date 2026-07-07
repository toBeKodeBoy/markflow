/**
 * @file tests/unit/mathStyles.test.ts
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('math styles', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8')

  it('块级公式容器不应强制居中', () => {
    const block = css.match(/\.markdown-body \.math-block[\s\S]*?\}/)?.[0] ?? ''
    expect(block).not.toMatch(/text-align:\s*center/)
  })

  it('katex-display 应左对齐', () => {
    expect(css).toMatch(/\.markdown-body \.katex-display[\s\S]*?text-align:\s*left/)
  })
})

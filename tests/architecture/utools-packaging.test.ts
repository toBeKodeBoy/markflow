/**
 * uTools 打包约束：UPXS 不能引入网络 JS / CSS。
 * Electron preload 必须是 CommonJS（.cjs），不能被根 package.json 的 "type": "module" 当成 ESM。
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')

function readSrc(rel: string) {
  return readFileSync(resolve(root, rel), 'utf-8')
}

const NETWORK_STYLESHEET_OR_SCRIPT =
  /<(?:link|script)\b[^>]*(?:href|src)\s*=\s*["']https?:\/\//i

describe('uTools 打包', () => {
  it('index.html 不得外链网络 JS 或 CSS', () => {
    const html = readSrc('index.html')
    expect(html).not.toMatch(NETWORK_STYLESHEET_OR_SCRIPT)
    expect(html).not.toMatch(/fonts\.googleapis\.com/)
    expect(html).not.toMatch(/fonts\.gstatic\.com/)
  })

  it('preload 应为 .cjs，避免 type:module 下被 Electron require 失败', () => {
    const pkg = JSON.parse(readSrc('package.json')) as { type?: string }
    const plugin = JSON.parse(readSrc('public/plugin.json')) as {
      preload: string
      development: { preload: string }
    }
    const vite = readSrc('vite.config.ts')

    expect(pkg.type).toBe('module')
    expect(existsSync(resolve(root, 'public/preload.cjs'))).toBe(true)
    expect(existsSync(resolve(root, 'public/preload.js'))).toBe(false)
    expect(plugin.preload).toBe('preload.cjs')
    expect(plugin.development.preload).toBe('preload.cjs')
    expect(vite).toMatch(/['"]preload\.cjs['"]/)
    expect(vite).not.toMatch(/['"]preload\.js['"]/)
    expect(readSrc('public/preload.cjs')).toMatch(/require\(/)
    expect(readSrc('public/preload.cjs')).not.toMatch(/^import /m)
  })
})

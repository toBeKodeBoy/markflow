/**
 * uTools 打包约束：
 * - UPXS 不能引入网络 JS / CSS
 * - plugin.json 的 preload 必须是 .js（开发者工具报错「preload 必须是 JS 文件」）
 * - preload 内容必须是 CommonJS；根 package.json 为 type:module，
 *   因此 public/ 需自带 type:commonjs，避免 Electron 把 preload.js 当 ESM
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

  it('preload 必须是 .js，且以 CommonJS 加载', () => {
    const rootPkg = JSON.parse(readSrc('package.json')) as { type?: string }
    const pluginPkg = JSON.parse(readSrc('public/package.json')) as { type?: string }
    const plugin = JSON.parse(readSrc('public/plugin.json')) as {
      preload: string
      development: { preload: string }
    }
    const vite = readSrc('vite.config.ts')

    expect(rootPkg.type).toBe('module')
    expect(pluginPkg.type).toBe('commonjs')
    expect(existsSync(resolve(root, 'public/preload.js'))).toBe(true)
    expect(existsSync(resolve(root, 'public/preload.cjs'))).toBe(false)
    expect(plugin.preload).toBe('preload.js')
    expect(plugin.development.preload).toBe('preload.js')
    expect(plugin.preload).toMatch(/\.js$/)
    expect(plugin.preload).not.toMatch(/\.cjs$/)
    expect(vite).toMatch(/['"]preload\.js['"]/)
    expect(vite).not.toMatch(/['"]preload\.cjs['"]/)
    expect(vite).toMatch(/['"]package\.json['"]/)
    expect(readSrc('public/preload.js')).toMatch(/require\(/)
    expect(readSrc('public/preload.js')).not.toMatch(/^import /m)
  })
})

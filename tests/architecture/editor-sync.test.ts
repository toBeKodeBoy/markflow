/**
 * 编辑器同步策略 — 防止防抖保存回写触发全量刷新（光标跳末尾）
 * @file tests/architecture/editor-sync.test.ts
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')

function readSrc(rel: string) {
  return readFileSync(resolve(root, rel), 'utf-8')
}

describe('editor sync watch policy (方案 A)', () => {
  it('WysiwygEditor 不应 watch currentNote.content', () => {
    const src = readSrc('src/components/WysiwygEditor.vue')
    expect(src).not.toMatch(
      /watch\(\s*\[\s*\(\)\s*=>\s*store\.currentNote\?\.id,\s*\(\)\s*=>\s*store\.currentNote\?\.content\s*\]/
    )
    expect(src).toMatch(/watch\(\s*\(\)\s*=>\s*store\.currentNote\?\.id/)
  })

  it('Editor 不应 watch currentNote.content', () => {
    const src = readSrc('src/components/Editor.vue')
    expect(src).not.toMatch(
      /watch\(\s*\[\s*\(\)\s*=>\s*store\.currentNote\?\.id,\s*\(\)\s*=>\s*store\.currentNote\?\.content\s*\]/
    )
    expect(src).toMatch(/watch\(\s*\(\)\s*=>\s*store\.currentNote\?\.id/)
  })
})

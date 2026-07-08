/**
 * 编辑器同步策略 — 多 Tab 下按 noteId 隔离实例，禁止 watch 全文 content
 * @file tests/architecture/editor-sync.test.ts
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')

function readSrc(rel: string) {
  return readFileSync(resolve(root, rel), 'utf-8')
}

describe('editor sync watch policy (multi-tab)', () => {
  it('WysiwygEditor 不应 watch currentNote.content', () => {
    const src = readSrc('src/components/WysiwygEditor.vue')
    expect(src).not.toMatch(
      /watch\(\s*\[\s*\(\)\s*=>\s*store\.currentNote\?\.id,\s*\(\)\s*=>\s*store\.currentNote\?\.content\s*\]/
    )
    expect(src).not.toMatch(/watch\(\s*\(\)\s*=>\s*store\.currentNote\?\.id/)
    expect(src).toMatch(/noteId:\s*string/)
  })

  it('Editor 不应 watch currentNote.content 或 id', () => {
    const src = readSrc('src/components/Editor.vue')
    expect(src).not.toMatch(
      /watch\(\s*\[\s*\(\)\s*=>\s*store\.currentNote\?\.id,\s*\(\)\s*=>\s*store\.currentNote\?\.content\s*\]/
    )
    expect(src).not.toMatch(/watch\(\s*\(\)\s*=>\s*store\.currentNote\?\.id/)
    expect(src).toMatch(/noteId:\s*string/)
  })
})

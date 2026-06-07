/**
 * 常量测试 — 验证 LARGE_FILE_THRESHOLD 和各防抖延迟
 * @file tests/unit/constants.test.ts
 */
import { describe, it, expect } from 'vitest'
import { LARGE_FILE_THRESHOLD, TOC_PARSE_DEBOUNCE_MS, PREVIEW_RENDER_DEBOUNCE_MS, PREVIEW_LARGE_DEBOUNCE_MS } from '../../src/constants'

describe('constants', () => {
  it('LARGE_FILE_THRESHOLD 应为 200,000 字符', () => {
    expect(LARGE_FILE_THRESHOLD).toBe(200_000)
  })

  it('TOC_PARSE_DEBOUNCE_MS 应为 400ms', () => {
    expect(TOC_PARSE_DEBOUNCE_MS).toBe(400)
  })

  it('PREVIEW_RENDER_DEBOUNCE_MS 应为 150ms', () => {
    expect(PREVIEW_RENDER_DEBOUNCE_MS).toBe(150)
  })

  it('PREVIEW_LARGE_DEBOUNCE_MS 应大于普通防抖', () => {
    expect(PREVIEW_LARGE_DEBOUNCE_MS).toBeGreaterThan(PREVIEW_RENDER_DEBOUNCE_MS)
    expect(PREVIEW_LARGE_DEBOUNCE_MS).toBe(600)
  })
})

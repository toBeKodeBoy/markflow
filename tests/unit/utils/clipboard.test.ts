/**
 * @file tests/unit/utils/clipboard.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { writeClipboard } from '../../../src/utils/clipboard'

describe('writeClipboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应优先使用 markflow.copyText', async () => {
    window.markflow.copyText = vi.fn(() => true)
    const ok = await writeClipboard('hello')
    expect(ok).toBe(true)
    expect(window.markflow.copyText).toHaveBeenCalledWith('hello')
  })

  it('copyText 失败时应回退到 navigator.clipboard', async () => {
    window.markflow.copyText = vi.fn(() => false)
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    const ok = await writeClipboard('fallback')
    expect(ok).toBe(true)
    expect(writeText).toHaveBeenCalledWith('fallback')
  })
})

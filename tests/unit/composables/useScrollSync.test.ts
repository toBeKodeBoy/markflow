/**
 * 滚动同步测试 — 验证 useScrollSync 的锁定机制
 *
 * 注意：useScrollSync 使用模块级状态（scrollRatio ref + locked 变量），
 * 所以测试之间共享状态。测试顺序依赖需谨慎。
 * @file tests/unit/composables/useScrollSync.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useScrollSync } from '../../../src/composables/useScrollSync'

describe('useScrollSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.runAllTimers() // flush any pending rAF callbacks to reset locked
    vi.useRealTimers()
  })

  it('初始 scrollRatio 应为 0', () => {
    const { scrollRatio } = useScrollSync()
    expect(scrollRatio.value).toBe(0)
  })

  it('setRatio 应更新 scrollRatio 的值', () => {
    const { scrollRatio, setRatio } = useScrollSync()
    setRatio(0.5)
    expect(scrollRatio.value).toBe(0.5)
  })

  it('锁定期间 setRatio 不生效，rAF 后解锁', () => {
    const { scrollRatio, setRatio } = useScrollSync()

    setRatio(0.7)  // 第一次调用：锁定并赋值
    expect(scrollRatio.value).toBe(0.7)

    setRatio(0.8)  // 锁定中，被拒绝
    expect(scrollRatio.value).toBe(0.7)

    // 触发 rAF 回调（解锁 locked）
    vi.advanceTimersToNextFrame()

    setRatio(0.9)  // 解锁后再次赋值
    expect(scrollRatio.value).toBe(0.9)
  })

  it('连续调用 setRatio 应锁定防止回弹', () => {
    const { scrollRatio, setRatio } = useScrollSync()
    setRatio(0.1)
    setRatio(0.2)  // 被 locked 拒绝
    expect(scrollRatio.value).toBe(0.1)
  })
})

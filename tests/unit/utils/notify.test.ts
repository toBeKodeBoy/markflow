/**
 * 通知工具测试 — 验证 uTools 环境与浏览器环境的通知分发
 * @file tests/unit/utils/notify.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { showAppNotification } from '../../../src/utils/notify'

describe('showAppNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('在 uTools 环境下应调用 window.markflow.showNotification', () => {
    showAppNotification('测试消息')
    expect(window.markflow.showNotification).toHaveBeenCalledWith('测试消息')
  })

  it('在非 uTools 环境下应 fallback 到 console.warn', () => {
    // 移除 markflow 桥接模拟非 uTools 环境
    const markflow = window.markflow
    delete (window as any).markflow

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    showAppNotification('浏览器消息')
    expect(warnSpy).toHaveBeenCalledWith('[MarkFlow]', '浏览器消息')

    warnSpy.mockRestore()
    window.markflow = markflow
  })
})

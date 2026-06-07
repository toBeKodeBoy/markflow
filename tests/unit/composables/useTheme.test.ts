/**
 * 主题管理测试 — 验证 useTheme 的切换、初始化、跟随系统行为
 * @file tests/unit/composables/useTheme.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('useTheme', () => {
  beforeEach(async () => {
    // 重置 DOM 属性
    document.documentElement.removeAttribute('data-theme')
    vi.clearAllMocks()
    // 动态导入以重置模块内状态
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('applyTheme 应设置 data-theme 属性', async () => {
    const { useTheme } = await import('../../../src/composables/useTheme')
    const theme = useTheme()
    theme.applyTheme(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    theme.applyTheme(false)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('toggle 应切换主题并保存设置', async () => {
    const { useTheme } = await import('../../../src/composables/useTheme')
    const theme = useTheme()
    // 初始为 light
    theme.applyTheme(false)
    theme.toggle()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(window.markflow.saveSettings).toHaveBeenCalled()
  })

  it('跟随系统主题时使用 uTools isDarkTheme', async () => {
    vi.mocked(window.markflow.isDarkTheme).mockReturnValue(true)
    // 设置 settings.theme = 'system'
    vi.mocked(window.markflow.getSettings).mockReturnValue({
      theme: 'system', fontSize: 14, editorFontFamily: 'monospace',
      previewVisible: true, sidebarVisible: true,
    })

    const { useTheme } = await import('../../../src/composables/useTheme')
    const theme = useTheme()
    theme.init?.()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('手动主题不依赖系统检测', async () => {
    vi.mocked(window.markflow.getSettings).mockReturnValue({
      theme: 'light', fontSize: 14, editorFontFamily: 'monospace',
      previewVisible: true, sidebarVisible: true,
    })

    const { useTheme } = await import('../../../src/composables/useTheme')
    const theme = useTheme()
    theme.init?.()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})

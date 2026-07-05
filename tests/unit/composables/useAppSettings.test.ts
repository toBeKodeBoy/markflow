/**
 * @file tests/unit/composables/useAppSettings.test.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { clampFontSize, applyEditorCssVars, useAppSettings } from '../../../src/composables/useAppSettings'

describe('clampFontSize', () => {
  it('应限制在 12–24 范围内', () => {
    expect(clampFontSize(10)).toBe(12)
    expect(clampFontSize(30)).toBe(24)
    expect(clampFontSize(16.7)).toBe(17)
  })

  it('非法值应回退到 14', () => {
    expect(clampFontSize(NaN)).toBe(14)
  })
})

describe('applyEditorCssVars', () => {
  it('应设置 document 上的 CSS 变量', () => {
    applyEditorCssVars({
      theme: 'light',
      fontSize: 18,
      editorFontFamily: 'monospace',
      previewVisible: true,
      sidebarVisible: true,
    })
    expect(document.documentElement.style.getPropertyValue('--editor-font-size')).toBe('18px')
    expect(document.documentElement.style.getPropertyValue('--editor-font-family')).toBe('monospace')
  })
})

describe('useAppSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('load/save 应持久化字号与字体', () => {
    const { load, save, get } = useAppSettings()
    load()
    save({ fontSize: 20, editorFontFamily: "'Fira Code', monospace" })
    expect(get().fontSize).toBe(20)
    expect(get().editorFontFamily).toContain('Fira Code')
    expect(document.documentElement.style.getPropertyValue('--editor-font-size')).toBe('20px')
  })
})

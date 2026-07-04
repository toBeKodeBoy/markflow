import { ref } from 'vue'
import type { AppSettings } from '../types'
import { useStorage } from './useStorage'

export const EDITOR_FONT_OPTIONS: { value: string; label: string }[] = [
  { value: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace", label: 'JetBrains Mono' },
  { value: "'Fira Code', monospace", label: 'Fira Code' },
  { value: "'Cascadia Code', monospace", label: 'Cascadia Code' },
  { value: 'monospace', label: '系统等宽' },
  { value: 'ui-monospace, monospace', label: 'UI 等宽' },
]

const MIN_FONT_SIZE = 12
const MAX_FONT_SIZE = 24

const settingsRef = ref<AppSettings | null>(null)

/** 规范化字体大小到合法范围 */
export function clampFontSize(size: number): number {
  if (!Number.isFinite(size)) return 14
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(size)))
}

/** 将设置应用到 document 上的编辑器 CSS 变量 */
export function applyEditorCssVars(settings: AppSettings): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--editor-font-size', `${clampFontSize(settings.fontSize)}px`)
  root.style.setProperty('--editor-font-family', settings.editorFontFamily || 'monospace')
}

export function useAppSettings() {
  const storage = useStorage()

  function load(): AppSettings {
    const settings = storage.getSettings()
    settingsRef.value = settings
    applyEditorCssVars(settings)
    return settings
  }

  function get(): AppSettings {
    return settingsRef.value ?? storage.getSettings()
  }

  function save(partial: Partial<AppSettings>): AppSettings {
    const next: AppSettings = {
      ...storage.getSettings(),
      ...partial,
      fontSize: partial.fontSize !== undefined ? clampFontSize(partial.fontSize) : storage.getSettings().fontSize,
    }
    storage.saveSettings(next)
    settingsRef.value = next
    applyEditorCssVars(next)
    return next
  }

  return { settings: settingsRef, load, get, save, applyEditorCssVars }
}

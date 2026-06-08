import { ref, onMounted } from 'vue'
import { useStorage } from './useStorage'

const isDark = ref(false)

export function useTheme() {
  const storage = useStorage()

  /** 应用主题：更新 isDark 状态并设置 data-theme 属性 */
  function applyTheme(dark: boolean) {
    isDark.value = dark
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }

  /** 检测系统主题偏好（prefers-color-scheme） */
  function detectSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  // expose init so App.vue can call it
  /** 初始化主题：从设置读取配置，优先 uTools 主题，其次系统主题，最后手动设置 */
  function init() {
    const settings = storage.getSettings()
    if (settings.theme === 'system') {
      // try uTools isDarkTheme first
      if (typeof window.markflow !== 'undefined') {
        applyTheme(window.markflow.isDarkTheme())
      } else {
        applyTheme(detectSystemTheme())
      }
    } else {
      applyTheme(settings.theme === 'dark')
    }
  }

  /** 切换暗色/亮色主题并持久化到设置 */
  function toggle() {
    const settings = storage.getSettings()
    const nextDark = !isDark.value
    applyTheme(nextDark)
    settings.theme = nextDark ? 'dark' : 'light'
    storage.saveSettings(settings)
  }

  onMounted(() => init())

  return { isDark, toggle, applyTheme, init }
}

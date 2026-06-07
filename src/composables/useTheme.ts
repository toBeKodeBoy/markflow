import { ref, onMounted } from 'vue'
import { useStorage } from './useStorage'

const isDark = ref(false)

export function useTheme() {
  const storage = useStorage()

  function applyTheme(dark: boolean) {
    isDark.value = dark
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }

  function detectSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  // expose init so App.vue can call it
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

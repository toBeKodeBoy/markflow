import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useFullscreen() {
  const isFullscreen = ref(!!document.fullscreenElement)

  function onChange() {
    isFullscreen.value = !!document.fullscreenElement
  }

  async function enter() {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen()
      } catch {
        // 用户拒绝全屏授权或环境不支持
      }
    }
  }

  async function exit() {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen()
      } catch {
        // 忽略退出全屏时的异常
      }
    }
  }

  async function toggle() {
    if (isFullscreen.value) await exit()
    else await enter()
  }

  onMounted(() => document.addEventListener('fullscreenchange', onChange))
  onBeforeUnmount(() => document.removeEventListener('fullscreenchange', onChange))

  return { isFullscreen, enter, exit, toggle }
}

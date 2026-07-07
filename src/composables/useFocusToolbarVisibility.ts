import { ref, watch, onMounted, onBeforeUnmount, type Ref } from 'vue'

export const FOCUS_TOOLBAR_ZONE_PX = 80

export function shouldShowFocusToolbar(
  clientY: number,
  windowHeight: number,
  options?: { hoveringToolbar?: boolean; zonePx?: number }
): boolean {
  if (options?.hoveringToolbar) return true
  const zone = options?.zonePx ?? FOCUS_TOOLBAR_ZONE_PX
  return clientY >= windowHeight - zone
}

export function useFocusToolbarVisibility(enabled: Ref<boolean>) {
  const visible = ref(false)
  let hoveringToolbar = false
  let lastClientY = 0

  function syncVisibility(clientY: number) {
    if (!enabled.value) {
      visible.value = false
      return
    }
    visible.value = shouldShowFocusToolbar(clientY, window.innerHeight, { hoveringToolbar })
  }

  function onMouseMove(event: MouseEvent) {
    lastClientY = event.clientY
    syncVisibility(event.clientY)
  }

  function onToolbarEnter() {
    hoveringToolbar = true
    visible.value = true
  }

  function onToolbarLeave() {
    hoveringToolbar = false
    syncVisibility(lastClientY)
  }

  watch(enabled, (isEnabled) => {
    if (!isEnabled) visible.value = false
  })

  onMounted(() => {
    window.addEventListener('mousemove', onMouseMove)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('mousemove', onMouseMove)
  })

  return {
    visible,
    onToolbarEnter,
    onToolbarLeave,
  }
}

const APP_NOTIFICATION_EVENT = 'markflow:notification'

export function onAppNotification(listener: (message: string) => void) {
  const handler = (event: Event) => {
    listener((event as CustomEvent<string>).detail)
  }
  window.addEventListener(APP_NOTIFICATION_EVENT, handler)
  return () => window.removeEventListener(APP_NOTIFICATION_EVENT, handler)
}

/** uTools 环境调用 bridge API 显示通知，同时派发页面内通知事件 */
export function showAppNotification(message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(APP_NOTIFICATION_EVENT, { detail: message }))
  }

  if (typeof window !== 'undefined' && typeof window.markflow !== 'undefined') {
    window.markflow.showNotification(message)
  } else {
    console.warn('[MarkFlow]', message)
  }
}

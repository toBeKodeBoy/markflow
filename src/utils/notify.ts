/** uTools 环境调用 bridge API 显示通知，否则 fallback 到 console.warn */
export function showAppNotification(message: string) {
  if (typeof window !== 'undefined' && typeof window.markflow !== 'undefined') {
    window.markflow.showNotification(message)
  } else {
    console.warn('[MarkFlow]', message)
  }
}

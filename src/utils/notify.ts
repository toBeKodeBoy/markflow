export function showAppNotification(message: string) {
  if (typeof window !== 'undefined' && typeof window.markflow !== 'undefined') {
    window.markflow.showNotification(message)
  } else {
    console.warn('[MarkFlow]', message)
  }
}

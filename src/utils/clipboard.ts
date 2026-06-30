/** execCommand('copy') 回退方案，适用于 Clipboard API 不可用的环境 */
function fallbackCopy(text: string): boolean {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.body.removeChild(textarea)
  }
}

/** 写入剪贴板：优先 uTools 原生 API，其次 Clipboard API，最后回退到 execCommand */
export async function writeClipboard(text: string): Promise<boolean> {
  if (typeof window !== 'undefined' && typeof window.markflow?.copyText === 'function') {
    try {
      if (window.markflow.copyText(text)) return true
    } catch {
      // fall through
    }
  }
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // fall through
    }
  }
  return fallbackCopy(text)
}

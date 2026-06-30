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

/** 同步写入剪贴板：uTools 原生 API 或 execCommand 回退（须在用户手势同步栈内调用） */
export function writeClipboardSync(text: string): boolean {
  if (typeof window !== 'undefined' && typeof window.markflow?.copyText === 'function') {
    try {
      if (window.markflow.copyText(text)) return true
    } catch {
      // fall through
    }
  }
  return fallbackCopy(text)
}

/** 写入剪贴板：优先同步路径，其次 Clipboard API */
export async function writeClipboard(text: string): Promise<boolean> {
  if (writeClipboardSync(text)) return true
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // fall through
    }
  }
  return false
}

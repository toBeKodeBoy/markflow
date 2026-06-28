/**
 * 代码块复制工具函数
 * 从复制按钮出发，查找代码块内容并写入剪贴板
 */

const COPY_TEXT = '复制'
const COPIED_TEXT = '已复制!'
const COPY_DURATION = 2000

const timers = new WeakMap<HTMLButtonElement, ReturnType<typeof setTimeout>>()

function getCodeText(btn: HTMLButtonElement): string | null {
  const wrapper = btn.closest('.code-block-wrapper')
  if (!wrapper) return null
  const code = wrapper.querySelector('pre code')
  if (!code) return null
  return code.textContent ?? null
}

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

/** 写入剪贴板：优先 Clipboard API，失败时回退到 execCommand */
async function writeClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Clipboard API failed, fall through to execCommand
    }
  }
  return fallbackCopy(text)
}

export function handleCodeCopy(btn: HTMLButtonElement): void {
  const text = getCodeText(btn)
  if (text === null || text === undefined) return

  const trimmed = text.trim()
  if (!trimmed) return

  writeClipboard(trimmed).then((success) => {
    if (success) {
      btn.textContent = COPIED_TEXT
      const existing = timers.get(btn)
      if (existing) clearTimeout(existing)
      const timer = setTimeout(() => {
        btn.textContent = COPY_TEXT
        timers.delete(btn)
      }, COPY_DURATION)
      timers.set(btn, timer)
    } else {
      if (typeof window.markflow !== 'undefined') {
        window.markflow.showNotification('复制失败')
      }
    }
  })
}

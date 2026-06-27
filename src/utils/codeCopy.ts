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

export function handleCodeCopy(btn: HTMLButtonElement): void {
  const text = getCodeText(btn)
  if (text === null || text === undefined) return

  const trimmed = text.trim()
  if (!trimmed) return

  if (!navigator.clipboard) {
    if (typeof window.markflow !== 'undefined') {
      window.markflow.showNotification('复制失败')
    }
    return
  }

  navigator.clipboard.writeText(text)
    .then(() => {
      btn.textContent = COPIED_TEXT
      const existing = timers.get(btn)
      if (existing) clearTimeout(existing)
      const timer = setTimeout(() => {
        btn.textContent = COPY_TEXT
        timers.delete(btn)
      }, COPY_DURATION)
      timers.set(btn, timer)
    })
    .catch(() => {
      if (typeof window.markflow !== 'undefined') {
        window.markflow.showNotification('复制失败')
      }
    })
}

/**
 * 代码块复制工具函数
 * 从复制按钮出发，查找代码块内容并写入剪贴板
 */

import { writeClipboard } from './clipboard'

const COPY_TEXT = '复制'
const COPIED_TEXT = '已复制!'
const COPY_DURATION = 2000

const timers = new WeakMap<HTMLButtonElement, ReturnType<typeof setTimeout>>()

function getCodeText(btn: HTMLButtonElement): string | null {
  const wrapper = btn.closest('.code-block-wrapper')
  if (!wrapper) return null
  // WYSIWYG 代码块有两层 code：高亮层(.code-block-highlight)有 80ms 防抖，
  // 可能滞后或为空；编辑层(.code-block-editable)始终反映当前内容，优先取它。
  // 分屏预览只有单个 code，querySelector 兜底即可命中。
  const code =
    wrapper.querySelector('pre code.code-block-editable') ??
    wrapper.querySelector('pre code')
  if (!code) return null
  return code.textContent ?? null
}

export function handleCodeCopy(btn: HTMLButtonElement): void {
  const text = getCodeText(btn)
  if (text === null || text === undefined) {
    if (typeof window.markflow !== 'undefined') {
      window.markflow.showNotification('复制失败')
    }
    return
  }

  // 仅去掉 ProseMirror 尾部 <br> 产生的多余换行，保留代码内部缩进与空行
  const normalized = text.replace(/\n+$/, '')

  // 全为空白（含仅含空格/换行）时不触发复制，避免误触将空内容写入剪贴板
  if (normalized.trim() === '') return

  writeClipboard(normalized).then((success) => {
    if (success) {
      btn.textContent = COPIED_TEXT
      const existing = timers.get(btn)
      if (existing) clearTimeout(existing)
      const timer = setTimeout(() => {
        btn.textContent = COPY_TEXT
        timers.delete(btn)
      }, COPY_DURATION)
      timers.set(btn, timer)
    } else if (typeof window.markflow !== 'undefined') {
      window.markflow.showNotification('复制失败')
    }
  })
}

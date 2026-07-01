/**
 * 代码块复制工具函数
 * 从复制按钮出发，查找代码块内容并写入剪贴板
 */

import { writeClipboard, writeClipboardSync } from './clipboard'
import { showAppNotification } from './notify'

const COPY_TEXT = '复制'
const COPIED_TEXT = '已复制!'
const COPY_SUCCESS_MSG = '已复制!'
const COPY_DURATION = 2000

const timers = new WeakMap<HTMLButtonElement, ReturnType<typeof setTimeout>>()
const mouseDownTimers = new WeakMap<HTMLButtonElement, ReturnType<typeof setTimeout>>()

function setCopyButtonState(btn: HTMLButtonElement, copied: boolean) {
  btn.textContent = copied ? COPIED_TEXT : COPY_TEXT
  btn.classList.toggle('copied', copied)
}

/** 延迟到下一宏任务再通知，避免异步回退路径中 uTools 通知被吞 */
function deferNotify(message: string) {
  setTimeout(() => showAppNotification(message), 0)
}

/** 按钮「已复制!」状态延迟更新，避免 ProseMirror 在同一事件栈内覆盖 DOM */
function showCopyButtonFeedback(btn: HTMLButtonElement) {
  setTimeout(() => {
    setCopyButtonState(btn, true)
    const existing = timers.get(btn)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      setCopyButtonState(btn, false)
      timers.delete(btn)
    }, COPY_DURATION)
    timers.set(btn, timer)
  }, 0)
}

function onCopySuccess(btn: HTMLButtonElement, deferNotification = false) {
  if (deferNotification) deferNotify(COPY_SUCCESS_MSG)
  else showAppNotification(COPY_SUCCESS_MSG)
  showCopyButtonFeedback(btn)
}

/** WYSIWYG：捕获阶段拦截，防止 ProseMirror 在 mousedown 时抢焦点 */
export function handleCodeCopyCaptureMouseDown(e: MouseEvent): void {
  const btn = (e.target as HTMLElement).closest?.('.code-copy-btn') as HTMLButtonElement | null
  if (!btn) return
  e.preventDefault()
  e.stopPropagation()
  const existing = mouseDownTimers.get(btn)
  if (existing) clearTimeout(existing)
  mouseDownTimers.set(btn, setTimeout(() => mouseDownTimers.delete(btn), 250))
  handleCodeCopy(btn)
}

/** 容器级 click 委托（捕获阶段），与分屏 Preview 行为一致 */
export function handleCodeCopyCaptureClick(e: MouseEvent): void {
  const btn = (e.target as HTMLElement).closest?.('.code-copy-btn') as HTMLButtonElement | null
  if (!btn) return
  e.preventDefault()
  e.stopPropagation()
  if (mouseDownTimers.has(btn)) return
  handleCodeCopy(btn)
}

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
    deferNotify('复制失败')
    return
  }

  // 仅去掉 ProseMirror 尾部 <br> 产生的多余换行，保留代码内部缩进与空行
  const normalized = text.replace(/\n+$/, '')

  // 全为空白（含仅含空格/换行）时不触发复制，避免误触将空内容写入剪贴板
  if (normalized.trim() === '') {
    deferNotify('代码块为空，无法复制')
    return
  }

  if (writeClipboardSync(normalized)) {
    onCopySuccess(btn)
    return
  }

  void writeClipboard(normalized).then((success) => {
    if (success) onCopySuccess(btn, true)
    else deferNotify('复制失败')
  })
}

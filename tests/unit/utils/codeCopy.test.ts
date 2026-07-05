/**
 * @file tests/unit/utils/codeCopy.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  handleCodeCopy,
  handleCodeCopyCaptureClick,
  handleCodeCopyCaptureMouseDown,
} from '../../../src/utils/codeCopy'

describe('handleCodeCopy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('应从代码块复制文本并更新按钮文案', async () => {
    window.markflow.copyText = vi.fn(() => true)
    document.body.innerHTML = `
      <div class="code-block-wrapper">
        <button class="code-copy-btn">复制</button>
        <pre><code>const x = 1</code></pre>
      </div>
    `
    const btn = document.querySelector('.code-copy-btn') as HTMLButtonElement
    handleCodeCopy(btn)
    await vi.waitFor(() => {
      expect(btn.textContent).toBe('已复制!')
    })
    expect(window.markflow.copyText).toHaveBeenCalledWith('const x = 1')
    expect(window.markflow.showNotification).toHaveBeenCalledWith('代码已复制到剪贴板')
  })

  it('应在 mousedown 捕获阶段执行复制并避免 click 重复触发', () => {
    window.markflow.copyText = vi.fn(() => true)
    document.body.innerHTML = `
      <div class="code-block-wrapper">
        <button class="code-copy-btn">复制</button>
        <pre><code>const x = 1</code></pre>
      </div>
    `
    const btn = document.querySelector('.code-copy-btn') as HTMLButtonElement
    const down = {
      target: btn,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent
    const click = {
      target: btn,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent

    handleCodeCopyCaptureMouseDown(down)
    handleCodeCopyCaptureClick(click)
    expect(window.markflow.copyText).toHaveBeenCalledTimes(1)
  })

  it('空代码块不应触发复制', () => {
    window.markflow.copyText = vi.fn(() => true)
    document.body.innerHTML = `
      <div class="code-block-wrapper">
        <button class="code-copy-btn">复制</button>
        <pre><code>   </code></pre>
      </div>
    `
    const btn = document.querySelector('.code-copy-btn') as HTMLButtonElement
    handleCodeCopy(btn)
    expect(window.markflow.copyText).not.toHaveBeenCalled()
  })
})

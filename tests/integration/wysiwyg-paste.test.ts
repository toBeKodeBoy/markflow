/**
 * 预览模式（WysiwygEditor）粘贴 Markdown 集成验证
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useNoteStore } from '@/stores/note'
import { mountWysiwygEditor } from '../helpers/mountWysiwygEditor'

const PASTE_MD = '# Test\n\n**bold**'

function mockClipboard(payload: {
  plain: string
  html?: string
  vscode?: { mode: string }
}) {
  return {
    getData(type: string) {
      if (type === 'text/plain') return payload.plain
      if (type === 'text/html') return payload.html ?? ''
      if (type === 'vscode-editor-data') {
        return payload.vscode ? JSON.stringify(payload.vscode) : ''
      }
      return ''
    },
  }
}

function dispatchPaste(el: Element, clipboardData: ReturnType<typeof mockClipboard>) {
  const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent
  Object.defineProperty(event, 'clipboardData', { value: clipboardData })
  el.dispatchEvent(event)
}

describe('WysiwygEditor 粘贴 Markdown', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('纯 text/plain 应解析为标题与粗体', async () => {
    const { wrapper, prose } = await mountWysiwygEditor('')
    ;(prose as HTMLElement).focus()
    dispatchPaste(prose, mockClipboard({ plain: PASTE_MD }))

    await flushPromises()
    await new Promise((r) => setTimeout(r, 200))

    expect(prose.querySelector('h1')?.textContent).toContain('Test')
    expect(prose.querySelector('strong')?.textContent).toBe('bold')
    expect(prose.textContent).not.toContain('# Test')

    const store = useNoteStore()
    expect(store.liveContent).toMatch(/# Test/)
    expect(store.liveContent).toMatch(/\*\*bold\*\*/)

    await wrapper.unmount()
  }, 15000)

  it('同时含 text/html 时仍应解析 Markdown 源码', async () => {
    const { wrapper, prose } = await mountWysiwygEditor('')
    ;(prose as HTMLElement).focus()
    dispatchPaste(prose, mockClipboard({
      plain: PASTE_MD,
      html: '<meta charset="utf-8"><pre># Test\n\n**bold**</pre>',
    }))

    await flushPromises()
    await new Promise((r) => setTimeout(r, 200))

    expect(prose.querySelector('h1')?.textContent).toContain('Test')
    expect(prose.querySelector('strong')?.textContent).toBe('bold')

    await wrapper.unmount()
  }, 15000)

  it('VS Code markdown 剪贴板应解析而非插入代码块', async () => {
    const { wrapper, prose } = await mountWysiwygEditor('')
    ;(prose as HTMLElement).focus()
    dispatchPaste(prose, mockClipboard({
      plain: PASTE_MD,
      vscode: { mode: 'markdown' },
    }))

    await flushPromises()
    await new Promise((r) => setTimeout(r, 200))

    expect(prose.querySelector('h1')?.textContent).toContain('Test')
    expect(prose.querySelector('pre')).toBeNull()

    await wrapper.unmount()
  }, 15000)
})

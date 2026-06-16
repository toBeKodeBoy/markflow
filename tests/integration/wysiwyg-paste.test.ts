/**
 * 预览模式（WysiwygEditor）粘贴 Markdown 集成验证
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import WysiwygEditor from '@/components/WysiwygEditor.vue'
import { useNoteStore } from '@/stores/note'

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

async function mountWysiwyg() {
  const wrapper = mount(WysiwygEditor)
  await flushPromises()
  await new Promise((r) => setTimeout(r, 600))
  const prose = wrapper.element.querySelector('.ProseMirror')
  expect(prose).toBeTruthy()
  return { wrapper, prose: prose! }
}

describe('WysiwygEditor 粘贴 Markdown', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    const store = useNoteStore()
    store.createNoteWithContent('')
  })

  it('纯 text/plain 应解析为标题与粗体', async () => {
    const { wrapper, prose } = await mountWysiwyg()
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
    const { wrapper, prose } = await mountWysiwyg()
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
    const { wrapper, prose } = await mountWysiwyg()
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

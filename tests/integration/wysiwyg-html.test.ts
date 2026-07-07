/**
 * 预览模式（WysiwygEditor）HTML 语法渲染集成验证
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useNoteStore } from '@/stores/note'
import { mountWysiwygEditor } from '../helpers/mountWysiwygEditor'

function pastePlainText(prose: Element, text: string) {
  const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent
  Object.defineProperty(event, 'clipboardData', {
    value: {
      getData(type: string) {
        if (type === 'text/plain') return text
        return ''
      },
    },
  })
  prose.dispatchEvent(event)
}

describe('WysiwygEditor HTML 渲染', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('内联 <b> 应渲染为粗体而非纯文本', async () => {
    const { wrapper, prose } = await mountWysiwygEditor('text <b>bold</b> end')

    expect(prose.querySelector('b')?.textContent).toBe('bold')
    expect(prose.textContent).toContain('text')
    expect(prose.textContent).toContain('end')
    expect(prose.textContent).not.toContain('<b>')

    await wrapper.unmount()
  }, 15000)

  it('块级 <div> 应渲染为实际元素', async () => {
    const { wrapper, prose } = await mountWysiwygEditor('<div class="html-block">block</div>')

    expect(prose.querySelector('.html-block')?.textContent).toBe('block')
    expect(prose.textContent).not.toContain('<div')

    await wrapper.unmount()
  }, 15000)

  it('带属性的 <span> 应保留样式渲染', async () => {
    const { wrapper, prose } = await mountWysiwygEditor('<span style="color:red">red</span>')

    const span = prose.querySelector('span[style*="color"]')
    expect(span?.textContent).toBe('red')
    expect(prose.textContent).not.toContain('<span')

    await wrapper.unmount()
  }, 15000)

  it('粘贴 <span> 后应即时渲染，无需刷新', async () => {
    const { wrapper, prose } = await mountWysiwygEditor('')
    ;(prose as HTMLElement).focus()
    pastePlainText(prose, '<span>live</span>')

    await flushPromises()
    await new Promise((r) => setTimeout(r, 300))

    expect(prose.querySelector('span')?.textContent).toBe('live')
    expect(prose.textContent).not.toContain('<span')

    await wrapper.unmount()
  }, 15000)
})

/**
 * 验证 WYSIWYG 保存 HTML 时是否错误转义为 \<
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mountWysiwygEditor } from '../helpers/mountWysiwygEditor'

describe('WYSIWYG HTML 序列化', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('保存 <span> 时不应添加反斜杠转义', async () => {
    const { wrapper, store } = await mountWysiwygEditor('<span>abc</span>')

    expect(store.liveContent).not.toMatch(/\\</)
    expect(store.liveContent).toContain('<span>abc</span>')

    await wrapper.unmount()
  }, 15000)

  it('被转义的 \\<span> 加载后应还原并渲染', async () => {
    const { wrapper, prose, store } = await mountWysiwygEditor(String.raw`\<span>abc\</span>`)

    expect(prose.querySelector('span')?.textContent).toBe('abc')
    expect(store.liveContent).not.toMatch(/\\</)
    expect(store.liveContent).toContain('<span>abc</span>')

    await wrapper.unmount()
  }, 15000)
})

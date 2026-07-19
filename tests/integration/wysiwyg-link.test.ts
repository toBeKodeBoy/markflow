/**
 * WYSIWYG 工具栏链接插入集成验证
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { mountWysiwygEditor } from '../helpers/mountWysiwygEditor'

describe('WysiwygEditor 插入链接', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('空选区点击工具栏链接按钮后应写回默认 Markdown 链接', async () => {
    const { wrapper, prose, store } = await mountWysiwygEditor('')

    ;(prose as HTMLElement).focus()
    await wrapper.get('[aria-label="插入链接"]').trigger('click')

    await flushPromises()
    await new Promise((r) => setTimeout(r, 400))

    expect(store.liveContent).toContain('[链接文字](url)')

    await wrapper.unmount()
  }, 15000)
})

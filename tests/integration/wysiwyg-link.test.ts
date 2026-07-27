import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { mountWysiwygEditor } from '../helpers/mountWysiwygEditor'

describe('WysiwygEditor 插入链接', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('空选区点击工具栏链接按钮后应通过弹框写回带 title 的 Markdown 链接', async () => {
    const { wrapper, prose, store } = await mountWysiwygEditor('')

    ;(prose as HTMLElement).focus()
    await wrapper.get('[aria-label="插入链接"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="link-dialog-text"]').exists()).toBe(true)
    expect((wrapper.get('[data-testid="link-dialog-text"]').element as HTMLInputElement).value).toBe('链接文字')

    await wrapper.get('[data-testid="link-dialog-text"]').setValue('OpenAI')
    await wrapper.get('[data-testid="link-dialog-url"]').setValue('https://openai.com')
    await wrapper.get('[data-testid="link-dialog-title"]').setValue('官网')
    await wrapper.get('[data-testid="link-dialog-confirm"]').trigger('click')

    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 400))

    expect(store.liveContent).toContain('[OpenAI](https://openai.com "官网")')

    await wrapper.unmount()
  }, 15000)
})

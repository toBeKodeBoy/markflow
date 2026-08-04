import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Preview from '../../../src/components/Preview.vue'
import { useNoteStore } from '../../../src/stores/note'

vi.mock('../../../src/utils/resolveMarkdownAssets', () => ({
  resolveMarkdownForDisplay: vi.fn(async (content: string) => content),
}))

vi.mock('../../../src/utils/mermaidRender', () => ({
  hydrateMermaidBlocks: vi.fn(async () => {}),
  refreshMermaidBlocks: vi.fn(async () => {}),
}))

vi.mock('../../../src/utils/clipboard', () => ({
  writeClipboard: vi.fn(async () => true),
}))

describe('Preview 超链接跳转', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.mocked(window.markflow.showNotification).mockClear()
    window.markflow.openExternalUrl = vi.fn(() => true)
  })

  it('点击预览中的外部链接应调用 bridge 打开', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('[OpenAI](https://openai.com)')

    const wrapper = mount(Preview)

    vi.runAllTimers()
    await flushPromises()

    const link = wrapper.find('a[href="https://openai.com"]')
    expect(link.exists()).toBe(true)

    await link.trigger('click')

    expect(window.markflow.openExternalUrl).toHaveBeenCalledWith('https://openai.com')
    expect(window.markflow.showNotification).not.toHaveBeenCalled()
  })
})


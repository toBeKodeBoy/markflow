import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountWysiwygEditor } from '../helpers/mountWysiwygEditor'

vi.mock('@/utils/resolveMarkdownAssets', () => ({
  resolveMarkdownForDisplay: vi.fn(async (content: string) => content),
  persistMarkdownAssets: vi.fn(async (content: string) => content),
}))

vi.mock('@/utils/mermaidRender', () => ({
  hydrateMermaidBlocks: vi.fn(async () => {}),
  refreshMermaidBlocks: vi.fn(async () => {}),
}))

describe('WysiwygEditor 链接点击', () => {
  beforeEach(() => {
    localStorage.clear()
    window.markflow.openExternalUrl = vi.fn(() => true)
  })

  it('普通单击不应打开链接', async () => {
    const { wrapper, prose } = await mountWysiwygEditor('[OpenAI](https://openai.com)')

    const link = prose.querySelector('a[href="https://openai.com"]')
    expect(link).not.toBeNull()

    link!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    expect(window.markflow.openExternalUrl).not.toHaveBeenCalled()

    await wrapper.unmount()
  }, 15000)

  it('Ctrl 单击应打开链接', async () => {
    const { wrapper, prose } = await mountWysiwygEditor('[OpenAI](https://openai.com)')

    const link = prose.querySelector('a[href="https://openai.com"]')
    expect(link).not.toBeNull()

    link!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }))
    await Promise.resolve()

    expect(window.markflow.openExternalUrl).toHaveBeenCalledWith('https://openai.com')

    await wrapper.unmount()
  }, 15000)
})

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

describe('Preview 任务清单交互', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  it('点击预览任务 checkbox 后按行回写 Markdown', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('- [ ] 第一项\n- [x] 第二项')

    const wrapper = mount(Preview)

    vi.runAllTimers()
    await flushPromises()

    const checkboxes = wrapper.findAll('input.task-list-item-checkbox')
    expect(checkboxes).toHaveLength(2)
    expect(checkboxes[0].attributes('disabled')).toBeUndefined()

    await checkboxes[0].trigger('click')
    vi.runAllTimers()
    await flushPromises()

    expect(store.liveContent).toBe('- [x] 第一项\n- [x] 第二项')
    expect(store.currentNote?.content).toBe('- [x] 第一项\n- [x] 第二项')
  })

  it('预览任务项会携带稳定的 data-task-line 映射', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# 标题\n\n- [ ] 第一项\n- [x] 第二项')

    const wrapper = mount(Preview)

    vi.runAllTimers()
    await flushPromises()

    const items = wrapper.findAll('li.task-list-item')
    expect(items).toHaveLength(2)
    expect(items[0].attributes('data-task-line')).toBe('3')
    expect(items[0].attributes('data-checked')).toBe('false')
    expect(items[1].attributes('data-task-line')).toBe('4')
    expect(items[1].attributes('data-checked')).toBe('true')
  })
})

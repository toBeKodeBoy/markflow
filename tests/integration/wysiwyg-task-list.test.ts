/**
 * 预览模式（WysiwygEditor / Milkdown）任务清单渲染
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mountWysiwygEditor } from '../helpers/mountWysiwygEditor'

const LOOSE_TASK_LIST = `# 任务清单

* [x] 任务1

* [x] 任务2

* [ ] 任务3`

describe('WysiwygEditor 任务清单', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('应解析为带 data-item-type=task 的列表项', async () => {
    const { wrapper, prose } = await mountWysiwygEditor(LOOSE_TASK_LIST)
    const items = prose.querySelectorAll('li[data-item-type="task"]')
    expect(items.length).toBe(3)
    await wrapper.unmount()
  }, 15000)

  it('应正确反映 checked 状态', async () => {
    const { wrapper, prose } = await mountWysiwygEditor(LOOSE_TASK_LIST)
    const items = [...prose.querySelectorAll('li[data-item-type="task"]')]
    expect(items[0].getAttribute('data-checked')).toBe('true')
    expect(items[1].getAttribute('data-checked')).toBe('true')
    expect(items[2].getAttribute('data-checked')).toBe('false')
    await wrapper.unmount()
  }, 15000)

  it('不应把 [x] 语法泄漏为可见文本', async () => {
    const { wrapper, prose } = await mountWysiwygEditor(LOOSE_TASK_LIST)
    expect(prose.textContent).not.toMatch(/\[x\]/i)
    expect(prose.textContent).not.toMatch(/\[ \]/)
    await wrapper.unmount()
  }, 15000)

  it('任务文字应保留在列表项内', async () => {
    const { wrapper, prose } = await mountWysiwygEditor(LOOSE_TASK_LIST)
    const items = [...prose.querySelectorAll('li[data-item-type="task"]')]
    expect(items[0].textContent?.trim()).toBe('任务1')
    expect(items[1].textContent?.trim()).toBe('任务2')
    expect(items[2].textContent?.trim()).toBe('任务3')
    await wrapper.unmount()
  }, 15000)

  it('点击任务勾选区后应切换 checked 状态并回写 Markdown', async () => {
    const { wrapper, prose, store } = await mountWysiwygEditor(LOOSE_TASK_LIST)
    const firstItem = prose.querySelector('li[data-item-type="task"]') as HTMLElement

    firstItem.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      clientX: 2,
      clientY: 8,
    }))

    await new Promise((resolve) => setTimeout(resolve, 400))

    const items = [...prose.querySelectorAll('li[data-item-type="task"]')]
    expect(items[0].getAttribute('data-checked')).toBe('false')
    expect(store.liveContent).toContain('* [ ] 任务1')
    await wrapper.unmount()
  }, 15000)
})

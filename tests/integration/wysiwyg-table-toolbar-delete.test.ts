/**
 * WYSIWYG 表格删除后工具栏应立即隐藏
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { mountWysiwygEditor } from '../helpers/mountWysiwygEditor'

describe('WysiwygEditor 表格工具栏删除回收', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('删除整张表后应立即隐藏表格工具栏', async () => {
    const { wrapper, prose } = await mountWysiwygEditor('')

    ;(prose as HTMLElement).focus()
    await wrapper.get('[data-testid="toolbar-table"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="table-toolbar"]').exists()).toBe(true)

    await wrapper.get('[data-testid="table-delete-table"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="table-toolbar"]').exists()).toBe(false)

    await wrapper.unmount()
  }, 15000)
})

import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { mountWysiwygEditor } from '../helpers/mountWysiwygEditor'

describe('WysiwygEditor 表格工具栏占位渲染', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('进入表格后在表格前渲染占位工具栏，删除表格后立即移除', async () => {
    const { wrapper, prose } = await mountWysiwygEditor('')

    ;(prose as HTMLElement).focus()
    await wrapper.get('[data-testid="toolbar-table"]').trigger('click')
    await flushPromises()

    const toolbar = wrapper.get('[data-testid="table-toolbar"]')
    const toolbarSlot = (toolbar.element as HTMLElement).closest('.markflow-table-toolbar-slot')
    const tableElement = wrapper.element.querySelector('.ProseMirror table')
    expect(toolbarSlot).toBeTruthy()
    expect(tableElement).toBeTruthy()
    expect(toolbarSlot?.compareDocumentPosition(tableElement as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await wrapper.get('[data-testid="table-delete-table"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="table-toolbar"]').exists()).toBe(false)

    await wrapper.unmount()
  }, 15000)
})

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TableToolbar from '../../../src/components/TableToolbar.vue'

describe('TableToolbar', () => {
  it('renders all action buttons when visible', () => {
    const wrapper = mount(TableToolbar, { props: { visible: true } })
    expect(wrapper.find('[data-testid="table-add-row"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="table-add-col"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="table-delete-row"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="table-delete-col"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="table-delete-table"]').exists()).toBe(true)
  })

  it('is not rendered when visible is false', () => {
    const wrapper = mount(TableToolbar, { props: { visible: false } })
    expect(wrapper.find('.table-toolbar').exists()).toBe(false)
  })

  it('emits addRowAfter when add-row button clicked', async () => {
    const wrapper = mount(TableToolbar, { props: { visible: true } })
    await wrapper.get('[data-testid="table-add-row"]').trigger('click')
    expect(wrapper.emitted('addRowAfter')).toHaveLength(1)
  })

  it('emits addColAfter when add-col button clicked', async () => {
    const wrapper = mount(TableToolbar, { props: { visible: true } })
    await wrapper.get('[data-testid="table-add-col"]').trigger('click')
    expect(wrapper.emitted('addColAfter')).toHaveLength(1)
  })

  it('emits deleteRow when delete-row button clicked', async () => {
    const wrapper = mount(TableToolbar, { props: { visible: true } })
    await wrapper.get('[data-testid="table-delete-row"]').trigger('click')
    expect(wrapper.emitted('deleteRow')).toHaveLength(1)
  })

  it('emits deleteCol when delete-col button clicked', async () => {
    const wrapper = mount(TableToolbar, { props: { visible: true } })
    await wrapper.get('[data-testid="table-delete-col"]').trigger('click')
    expect(wrapper.emitted('deleteCol')).toHaveLength(1)
  })

  it('emits deleteTable when delete-table button clicked', async () => {
    const wrapper = mount(TableToolbar, { props: { visible: true } })
    await wrapper.get('[data-testid="table-delete-table"]').trigger('click')
    expect(wrapper.emitted('deleteTable')).toHaveLength(1)
  })
})

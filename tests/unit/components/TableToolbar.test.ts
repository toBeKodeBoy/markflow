import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TableToolbar from '../../../src/components/TableToolbar.vue'

const defaultContext = {
  rowIndex: 1,
  colIndex: 2,
  rowCount: 3,
  colCount: 4,
  canDeleteRow: true,
  canDeleteCol: true,
}

describe('TableToolbar', () => {
  it('renders a single inline toolbar with all table actions', () => {
    const wrapper = mount(TableToolbar, {
      props: { context: defaultContext },
    })

    expect(wrapper.get('[data-testid="table-toolbar-status"]').text()).toContain('第2行 / 第3列')
    expect(wrapper.find('[data-testid="table-add-row-before"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="table-add-row-after"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="table-add-col-before"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="table-add-col-after"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="table-align-left"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="table-align-center"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="table-align-right"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="table-delete-row"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="table-delete-col"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="table-delete-table"]').exists()).toBe(true)
  })

  it('emits all action events directly from the inline toolbar', async () => {
    const wrapper = mount(TableToolbar, {
      props: { context: defaultContext },
    })

    await wrapper.get('[data-testid="table-add-row-before"]').trigger('click')
    await wrapper.get('[data-testid="table-add-row-after"]').trigger('click')
    await wrapper.get('[data-testid="table-add-col-before"]').trigger('click')
    await wrapper.get('[data-testid="table-add-col-after"]').trigger('click')
    await wrapper.get('[data-testid="table-align-center"]').trigger('click')
    await wrapper.get('[data-testid="table-delete-row"]').trigger('click')
    await wrapper.get('[data-testid="table-delete-col"]').trigger('click')
    await wrapper.get('[data-testid="table-delete-table"]').trigger('click')

    expect(wrapper.emitted('addRowBefore')).toHaveLength(1)
    expect(wrapper.emitted('addRowAfter')).toHaveLength(1)
    expect(wrapper.emitted('addColBefore')).toHaveLength(1)
    expect(wrapper.emitted('addColAfter')).toHaveLength(1)
    expect(wrapper.emitted('setColAlign')?.[0]).toEqual(['center'])
    expect(wrapper.emitted('deleteRow')).toHaveLength(1)
    expect(wrapper.emitted('deleteCol')).toHaveLength(1)
    expect(wrapper.emitted('deleteTable')).toHaveLength(1)
  })

  it('disables delete row when only one row remains', () => {
    const wrapper = mount(TableToolbar, {
      props: {
        context: { ...defaultContext, rowCount: 1, canDeleteRow: false },
      },
    })

    const button = wrapper.get('[data-testid="table-delete-row"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('title')).toContain('至少保留一行')
  })

  it('disables delete col when only one col remains', () => {
    const wrapper = mount(TableToolbar, {
      props: {
        context: { ...defaultContext, colCount: 1, canDeleteCol: false },
      },
    })

    const button = wrapper.get('[data-testid="table-delete-col"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('title')).toContain('至少保留一列')
  })
})

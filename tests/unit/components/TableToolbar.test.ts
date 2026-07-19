import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TableToolbar from '../../../src/components/TableToolbar.vue'

const defaultPosition = { top: 50, left: 100 }

describe('TableToolbar', () => {
  it('renders all action buttons when visible', () => {
    const wrapper = mount(TableToolbar, { props: { visible: true, position: defaultPosition } })
    expect(wrapper.find('[data-testid="table-add-row"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="table-add-col"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="table-delete-row"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="table-delete-col"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="table-delete-table"]').exists()).toBe(true)
  })

  it('is not rendered when visible is false', () => {
    const wrapper = mount(TableToolbar, { props: { visible: false, position: defaultPosition } })
    expect(wrapper.find('.table-toolbar').exists()).toBe(false)
  })

  it('emits addRowAfter when add-row button clicked', async () => {
    const wrapper = mount(TableToolbar, { props: { visible: true, position: defaultPosition } })
    await wrapper.get('[data-testid="table-add-row"]').trigger('click')
    expect(wrapper.emitted('addRowAfter')).toHaveLength(1)
  })

  it('emits addColAfter when add-col button clicked', async () => {
    const wrapper = mount(TableToolbar, { props: { visible: true, position: defaultPosition } })
    await wrapper.get('[data-testid="table-add-col"]').trigger('click')
    expect(wrapper.emitted('addColAfter')).toHaveLength(1)
  })

  it('emits deleteRow when delete-row button clicked', async () => {
    const wrapper = mount(TableToolbar, { props: { visible: true, position: defaultPosition } })
    await wrapper.get('[data-testid="table-delete-row"]').trigger('click')
    expect(wrapper.emitted('deleteRow')).toHaveLength(1)
  })

  it('emits deleteCol when delete-col button clicked', async () => {
    const wrapper = mount(TableToolbar, { props: { visible: true, position: defaultPosition } })
    await wrapper.get('[data-testid="table-delete-col"]').trigger('click')
    expect(wrapper.emitted('deleteCol')).toHaveLength(1)
  })

  it('emits deleteTable when delete-table button clicked', async () => {
    const wrapper = mount(TableToolbar, { props: { visible: true, position: defaultPosition } })
    await wrapper.get('[data-testid="table-delete-table"]').trigger('click')
    expect(wrapper.emitted('deleteTable')).toHaveLength(1)
  })

  it('applies position styles from props', () => {
    const pos = { top: 42, left: 88 }
    const wrapper = mount(TableToolbar, { props: { visible: true, position: pos } })
    const el = wrapper.find('.table-toolbar')
    expect(el.attributes('style')).toContain('top: 42px')
    expect(el.attributes('style')).toContain('left: 88px')
  })

  it('emits setColAlign with left when left-align button clicked', async () => {
    const wrapper = mount(TableToolbar, { props: { visible: true, position: defaultPosition } })
    await wrapper.get('[data-testid="table-align-left"]').trigger('click')
    expect(wrapper.emitted('setColAlign')![0]).toEqual(['left'])
  })

  it('emits setColAlign with center when center-align button clicked', async () => {
    const wrapper = mount(TableToolbar, { props: { visible: true, position: defaultPosition } })
    await wrapper.get('[data-testid="table-align-center"]').trigger('click')
    expect(wrapper.emitted('setColAlign')![0]).toEqual(['center'])
  })

  it('emits setColAlign with right when right-align button clicked', async () => {
    const wrapper = mount(TableToolbar, { props: { visible: true, position: defaultPosition } })
    await wrapper.get('[data-testid="table-align-right"]').trigger('click')
    expect(wrapper.emitted('setColAlign')![0]).toEqual(['right'])
  })
})

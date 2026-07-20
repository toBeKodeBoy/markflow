import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FormatToolbar from '../../../src/components/FormatToolbar.vue'

describe('FormatToolbar', () => {
  it('renders grouped toolbar sections', () => {
    const wrapper = mount(FormatToolbar, {
      props: { charCount: 42 },
    })

    const groups = wrapper.findAll('[data-testid="toolbar-group"]')
    expect(groups).toHaveLength(4)
    expect(wrapper.get('[data-testid="toolbar-group-text"]').text()).toContain('文字')
    expect(wrapper.get('[data-testid="toolbar-group-heading"]').text()).toContain('标题')
    expect(wrapper.get('[data-testid="toolbar-group-list"]').text()).toContain('列表')
    expect(wrapper.get('[data-testid="toolbar-group-insert"]').text()).toContain('插入')
    expect(wrapper.get('.char-count').text()).toContain('42')
  })

  it('emits the original table event from grouped insert actions', async () => {
    const wrapper = mount(FormatToolbar)
    await wrapper.get('[data-testid="toolbar-table"]').trigger('click')
    expect(wrapper.emitted('table')).toHaveLength(1)
  })
})

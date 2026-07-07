import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FocusFormatToolbar from '../../../src/components/FocusFormatToolbar.vue'

describe('FocusFormatToolbar', () => {
  it('renders mini formatting actions', () => {
    const wrapper = mount(FocusFormatToolbar, {
      props: { visible: true },
    })
    expect(wrapper.find('[data-testid="focus-toolbar-bold"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="focus-toolbar-italic"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="focus-toolbar-h1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="focus-toolbar-h2"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="focus-toolbar-bullet-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="focus-toolbar-ordered-list"]').exists()).toBe(true)
  })

  it('applies hidden class when not visible', () => {
    const wrapper = mount(FocusFormatToolbar, {
      props: { visible: false },
    })
    expect(wrapper.find('.focus-format-toolbar').classes()).toContain('is-hidden')
  })

  it('emits bold when bold button clicked', async () => {
    const wrapper = mount(FocusFormatToolbar, {
      props: { visible: true },
    })
    await wrapper.get('[data-testid="focus-toolbar-bold"]').trigger('click')
    expect(wrapper.emitted('bold')).toHaveLength(1)
  })

  it('emits bulletList when unordered list button clicked', async () => {
    const wrapper = mount(FocusFormatToolbar, {
      props: { visible: true },
    })
    await wrapper.get('[data-testid="focus-toolbar-bullet-list"]').trigger('click')
    expect(wrapper.emitted('bulletList')).toHaveLength(1)
  })

  it('forwards mouseenter and mouseleave for hover pinning', async () => {
    const wrapper = mount(FocusFormatToolbar, {
      props: { visible: true },
    })
    await wrapper.get('.focus-format-toolbar').trigger('mouseenter')
    await wrapper.get('.focus-format-toolbar').trigger('mouseleave')
    expect(wrapper.emitted('mouseenter')).toHaveLength(1)
    expect(wrapper.emitted('mouseleave')).toHaveLength(1)
  })
})

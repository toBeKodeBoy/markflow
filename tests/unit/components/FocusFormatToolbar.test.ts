import { describe, it, expect, vi } from 'vitest'
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

  it('renders image upload trigger and hidden file input in focus mode', () => {
    const wrapper = mount(FocusFormatToolbar, {
      props: { visible: true },
    })
    expect(wrapper.find('[data-testid="focus-toolbar-image-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="focus-toolbar-image-input"]').exists()).toBe(true)
  })

  it('opens file picker when focus image upload button is clicked', async () => {
    const wrapper = mount(FocusFormatToolbar, {
      props: { visible: true },
    })
    const input = wrapper.get('[data-testid="focus-toolbar-image-input"]')
    const clickSpy = vi.spyOn(input.element as HTMLInputElement, 'click')

    await wrapper.get('[data-testid="focus-toolbar-image-button"]').trigger('click')

    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('emits imageUpload after selecting a local image in focus mode', async () => {
    const wrapper = mount(FocusFormatToolbar, {
      props: { visible: true },
    })
    const input = wrapper.get('[data-testid="focus-toolbar-image-input"]')
    const file = new File(['focus'], 'focus.png', { type: 'image/png' })

    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [file],
    })
    Object.defineProperty(input.element, 'value', {
      configurable: true,
      writable: true,
      value: 'C:\\fakepath\\focus.png',
    })

    await input.trigger('change')

    expect(wrapper.emitted('imageUpload')).toHaveLength(1)
    expect(wrapper.emitted('imageUpload')?.[0]?.[0]).toBe(file)
    expect((input.element as HTMLInputElement).value).toBe('')
  })
})

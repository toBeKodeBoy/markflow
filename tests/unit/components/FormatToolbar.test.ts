import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import FormatToolbar from '../../../src/components/FormatToolbar.vue'

describe('FormatToolbar', () => {
  it('renders grouped toolbar sections with icon buttons', () => {
    const wrapper = mount(FormatToolbar, {
      global: { stubs: { AppIcon: true } },
    })

    const groups = wrapper.findAll('[data-testid="toolbar-group"]')
    expect(groups).toHaveLength(4)
    expect(wrapper.find('[data-testid="toolbar-group-text"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="toolbar-group-heading"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="toolbar-group-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="toolbar-group-insert"]').exists()).toBe(true)
    expect(wrapper.findAllComponents({ name: 'AppIcon' }).length).toBeGreaterThan(0)
    expect(wrapper.find('.char-count').exists()).toBe(false)
  })

  it('renders view mode dropdown when viewMode is provided', () => {
    const wrapper = mount(FormatToolbar, {
      props: { viewMode: 'live' },
      global: { stubs: { AppIcon: true, ViewModeDropdown: true } },
    })
    expect(wrapper.findComponent({ name: 'ViewModeDropdown' }).exists()).toBe(true)
  })

  it('does not render view mode dropdown without viewMode', () => {
    const wrapper = mount(FormatToolbar, {
      global: { stubs: { AppIcon: true, ViewModeDropdown: true } },
    })
    expect(wrapper.findComponent({ name: 'ViewModeDropdown' }).exists()).toBe(false)
  })
  it('emits the original table event from grouped insert actions', async () => {
    const wrapper = mount(FormatToolbar)
    await wrapper.get('[data-testid="toolbar-table"]').trigger('click')
    expect(wrapper.emitted('table')).toHaveLength(1)
  })

  it('renders the highlight action and emits highlight when clicked', async () => {
    const wrapper = mount(FormatToolbar)

    expect(wrapper.find('[data-testid="toolbar-highlight"]').exists()).toBe(true)

    await wrapper.get('[data-testid="toolbar-highlight"]').trigger('click')

    expect(wrapper.emitted('highlight')).toHaveLength(1)
  })

  it('renders the image upload trigger and hidden file input', () => {
    const wrapper = mount(FormatToolbar)
    expect(wrapper.find('[data-testid="toolbar-image-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="toolbar-image-input"]').exists()).toBe(true)
  })

  it('renders the task list button by default and emits taskList when clicked', async () => {
    const wrapper = mount(FormatToolbar)

    expect(wrapper.find('[data-testid="toolbar-task-list"]').exists()).toBe(true)

    await wrapper.get('[data-testid="toolbar-task-list"]').trigger('click')

    expect(wrapper.emitted('taskList')).toHaveLength(1)
  })

  it('hides the task list button when showTaskListButton is false', () => {
    const wrapper = mount(FormatToolbar, {
      props: {
        showTaskListButton: false,
      },
    })

    expect(wrapper.find('[data-testid="toolbar-task-list"]').exists()).toBe(false)
  })

  it('opens file picker when image upload button is clicked', async () => {
    const wrapper = mount(FormatToolbar)
    const input = wrapper.get('[data-testid="toolbar-image-input"]')
    const clickSpy = vi.spyOn(input.element as HTMLInputElement, 'click')

    await wrapper.get('[data-testid="toolbar-image-button"]').trigger('click')

    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('emits imageUpload after selecting a local image and resets the input', async () => {
    const wrapper = mount(FormatToolbar)
    const input = wrapper.get('[data-testid="toolbar-image-input"]')
    const file = new File(['demo'], 'demo.png', { type: 'image/png' })

    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [file],
    })
    Object.defineProperty(input.element, 'value', {
      configurable: true,
      writable: true,
      value: 'C:\\fakepath\\demo.png',
    })

    await input.trigger('change')

    expect(wrapper.emitted('imageUpload')).toHaveLength(1)
    expect(wrapper.emitted('imageUpload')?.[0]?.[0]).toBe(file)
    expect((input.element as HTMLInputElement).value).toBe('')
  })
})

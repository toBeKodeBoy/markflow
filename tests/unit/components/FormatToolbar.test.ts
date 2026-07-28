import { describe, it, expect, vi } from 'vitest'
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

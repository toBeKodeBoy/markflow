import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ViewModeDropdown from '../../../src/components/ViewModeDropdown.vue'

describe('ViewModeDropdown', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function mountDropdown(viewMode: 'live' | 'split' | 'source' | 'focus' = 'live') {
    return mount(ViewModeDropdown, {
      props: { viewMode },
      global: { stubs: { AppIcon: true } },
      attachTo: document.body,
    })
  }

  it('渲染触发按钮，默认菜单关闭', () => {
    const wrapper = mountDropdown()
    expect(wrapper.find('[data-testid="view-mode-dropdown"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="view-mode-dropdown-trigger"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="view-mode-dropdown-menu"]').exists()).toBe(false)
  })

  it('点击触发后展示四模式项与图标、快捷键', async () => {
    const wrapper = mountDropdown('split')
    await wrapper.find('[data-testid="view-mode-dropdown-trigger"]').trigger('click')
    await flushPromises()
    const menu = wrapper.get('[data-testid="view-mode-dropdown-menu"]')
    const text = menu.text()
    expect(text).toContain('预览')
    expect(text).toContain('分屏')
    expect(text).toContain('源码')
    expect(text).toContain('专注')
    expect(text).toContain('Ctrl+Shift+J')
    expect(menu.findAll('[data-testid^="view-mode-option-"]').length).toBe(4)
    expect(menu.find('[data-testid="view-mode-option-split"]').classes()).toContain('active')
  })

  it('点击选项 emit setViewMode 并关闭菜单', async () => {
    const wrapper = mountDropdown()
    await wrapper.find('[data-testid="view-mode-dropdown-trigger"]').trigger('click')
    await wrapper.find('[data-testid="view-mode-option-source"]').trigger('click')
    expect(wrapper.emitted('setViewMode')?.[0]).toEqual(['source'])
    expect(wrapper.find('[data-testid="view-mode-dropdown-menu"]').exists()).toBe(false)
  })

  it('flashFeedback 短暂打开菜单约 200ms', async () => {
    const wrapper = mountDropdown()
    ;(wrapper.vm as { flashFeedback: () => void }).flashFeedback()
    await flushPromises()
    expect(wrapper.find('[data-testid="view-mode-dropdown-menu"]').exists()).toBe(true)
    await vi.advanceTimersByTimeAsync(200)
    await flushPromises()
    expect(wrapper.find('[data-testid="view-mode-dropdown-menu"]').exists()).toBe(false)
  })

  it('placement=top 时菜单向上展开', async () => {
    const wrapper = mount(ViewModeDropdown, {
      props: { viewMode: 'live', placement: 'top' },
      global: { stubs: { AppIcon: true } },
      attachTo: document.body,
    })
    expect(wrapper.find('.view-mode-dropdown').classes()).toContain('is-drop-up')
    await wrapper.find('[data-testid="view-mode-dropdown-trigger"]').trigger('click')
    expect(wrapper.find('[data-testid="view-mode-dropdown-menu"]').exists()).toBe(true)
  })
})

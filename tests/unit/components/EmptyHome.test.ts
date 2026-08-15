import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EmptyHome from '../../../src/components/EmptyHome.vue'
import {
  EMPTY_HOME_TITLE,
  EMPTY_HOME_SUBTITLE,
  EMPTY_HOME_STORAGE_HINT,
  EMPTY_HOME_TEMPLATES_TITLE,
  EMPTY_HOME_EXAMPLE_LIBRARY_LABEL,
  EMPTY_HOME_OPEN_SIDEBAR_LABEL,
  EMPTY_HOME_CLOSE_SIDEBAR_LABEL,
} from '../../../src/constants/emptyHomeCopy'
import { NOTE_TEMPLATES } from '../../../src/constants/noteTemplates'

function mountHome(props?: { emptyLibrary?: boolean; sidebarVisible?: boolean }) {
  return mount(EmptyHome, {
    props: {
      emptyLibrary: props?.emptyLibrary ?? true,
      sidebarVisible: props?.sidebarVisible ?? false,
    },
  })
}

describe('EmptyHome', () => {
  it('空库时渲染欢迎文案、存储说明与三个主操作', () => {
    const wrapper = mountHome({ emptyLibrary: true, sidebarVisible: false })

    expect(wrapper.find('[data-testid="empty-tabs-state"]').exists()).toBe(true)
    expect(wrapper.text()).toContain(EMPTY_HOME_TITLE)
    expect(wrapper.text()).toContain(EMPTY_HOME_SUBTITLE)
    expect(wrapper.text()).toContain(EMPTY_HOME_STORAGE_HINT)
    expect(wrapper.find('[data-testid="empty-home-create"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="empty-home-import"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="empty-home-open-sidebar"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="empty-home-templates"]').exists()).toBe(true)
    expect(wrapper.text()).toContain(EMPTY_HOME_TEMPLATES_TITLE)
    expect(wrapper.findAll('[data-testid="empty-home-template-card"]')).toHaveLength(NOTE_TEMPLATES.length)
    expect(wrapper.findAll('[data-testid="empty-home-template-icon"]')).toHaveLength(NOTE_TEMPLATES.length)
    expect(wrapper.findAll('[data-testid="empty-home-hint-icon"]').length).toBeGreaterThanOrEqual(3)
    expect(wrapper.find('[data-testid="empty-home-example-library"]').text()).toContain(
      EMPTY_HOME_EXAMPLE_LIBRARY_LABEL,
    )
  })

  it('点击主按钮发出 create，导入发出 import', async () => {
    const wrapper = mountHome()

    await wrapper.find('[data-testid="empty-home-create"]').trigger('click')
    await wrapper.find('[data-testid="empty-home-import"]').trigger('click')
    await wrapper.find('[data-testid="empty-home-open-sidebar"]').trigger('click')

    expect(wrapper.emitted('create')).toHaveLength(1)
    expect(wrapper.emitted('import')).toHaveLength(1)
    expect(wrapper.emitted('toggleSidebar')).toHaveLength(1)
    expect(wrapper.emitted('openSidebar')).toBeUndefined()
  })

  it('侧栏关闭时按钮为打开文案且未按下', () => {
    const wrapper = mountHome({ sidebarVisible: false })
    const button = wrapper.find('[data-testid="empty-home-open-sidebar"]')

    expect(button.text()).toBe(EMPTY_HOME_OPEN_SIDEBAR_LABEL)
    expect(button.attributes('aria-pressed')).toBe('false')
    expect(button.classes()).not.toContain('active')
  })

  it('侧栏展开时按钮为收起文案且呈按下态', () => {
    const wrapper = mountHome({ sidebarVisible: true })
    const button = wrapper.find('[data-testid="empty-home-open-sidebar"]')

    expect(button.text()).toBe(EMPTY_HOME_CLOSE_SIDEBAR_LABEL)
    expect(button.attributes('aria-pressed')).toBe('true')
    expect(button.classes()).toContain('active')
  })

  it('点击模板卡发出 useTemplate，点击示例库发出 importExample', async () => {
    const wrapper = mountHome({ emptyLibrary: true })

    await wrapper.findAll('[data-testid="empty-home-template-card"]')[0].trigger('click')
    await wrapper.find('[data-testid="empty-home-example-library"]').trigger('click')

    expect(wrapper.emitted('useTemplate')?.[0]).toEqual([NOTE_TEMPLATES[0].id])
    expect(wrapper.emitted('importExample')).toHaveLength(1)
  })

  it('非空库时仍渲染模板区，但不渲染示例库入口', () => {
    const wrapper = mountHome({ emptyLibrary: false })

    expect(wrapper.find('[data-testid="empty-home-templates"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="empty-home-template-card"]')).toHaveLength(NOTE_TEMPLATES.length)
    expect(wrapper.find('[data-testid="empty-home-example-library"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="empty-home-hints"]').exists()).toBe(false)
  })
})

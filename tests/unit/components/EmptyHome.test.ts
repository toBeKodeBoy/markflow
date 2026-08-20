import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EmptyHome from '../../../src/components/EmptyHome.vue'
import {
  EMPTY_HOME_CREATE_LABEL,
  EMPTY_HOME_SEARCH_LABEL,
  EMPTY_HOME_SETTINGS_LABEL,
} from '../../../src/constants/emptyHomeCopy'

function mountHome() {
  return mount(EmptyHome)
}

describe('EmptyHome', () => {
  it('居中 Logo 与三行命令：新建 / 搜索 / 设置', () => {
    const wrapper = mountHome()
    const text = wrapper.text().replace(/\s+/g, ' ')

    expect(wrapper.find('[data-testid="empty-tabs-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="empty-home-mark"]').text()).toBe('M')
    expect(wrapper.find('[data-testid="empty-home-create"]').text()).toContain(EMPTY_HOME_CREATE_LABEL)
    expect(wrapper.find('[data-testid="empty-home-search"]').text()).toContain(EMPTY_HOME_SEARCH_LABEL)
    expect(wrapper.find('[data-testid="empty-home-settings"]').text()).toContain(EMPTY_HOME_SETTINGS_LABEL)
    expect(text.indexOf(EMPTY_HOME_CREATE_LABEL)).toBeLessThan(text.indexOf(EMPTY_HOME_SEARCH_LABEL))
    expect(text.indexOf(EMPTY_HOME_SEARCH_LABEL)).toBeLessThan(text.indexOf(EMPTY_HOME_SETTINGS_LABEL))
  })

  it('命令行展示 Ctrl 快捷键，不渲染模板、导入与欢迎长文案', () => {
    const wrapper = mountHome()
    const create = wrapper.find('[data-testid="empty-home-create"]').text()
    const search = wrapper.find('[data-testid="empty-home-search"]').text()
    const settings = wrapper.find('[data-testid="empty-home-settings"]').text()

    expect(create).toContain('Ctrl')
    expect(create).toContain('N')
    expect(search).toContain('Ctrl')
    expect(search).toContain('K')
    expect(settings).toContain('Ctrl')
    expect(settings).toContain('Alt')
    expect(settings).toContain('S')
    expect(wrapper.find('[data-testid="empty-home-templates"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="empty-home-import"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="empty-home-create-folder"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="empty-home-example-library"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="empty-home-open-sidebar"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('欢迎使用 MarkFlow')
    expect(wrapper.text()).not.toContain('从模板开始')
    expect(wrapper.text()).not.toContain('导入 .md')
    expect(wrapper.text()).not.toContain('知识库')
  })

  it('点击三行分别发出 create / openSearch / openSettings', async () => {
    const wrapper = mountHome()

    await wrapper.find('[data-testid="empty-home-create"]').trigger('click')
    await wrapper.find('[data-testid="empty-home-search"]').trigger('click')
    await wrapper.find('[data-testid="empty-home-settings"]').trigger('click')

    expect(wrapper.emitted('create')).toHaveLength(1)
    expect(wrapper.emitted('openSearch')).toHaveLength(1)
    expect(wrapper.emitted('openSettings')).toHaveLength(1)
    expect(wrapper.emitted('createFolder')).toBeUndefined()
    expect(wrapper.emitted('import')).toBeUndefined()
    expect(wrapper.emitted('useTemplate')).toBeUndefined()
    expect(wrapper.emitted('toggleSidebar')).toBeUndefined()
  })
})

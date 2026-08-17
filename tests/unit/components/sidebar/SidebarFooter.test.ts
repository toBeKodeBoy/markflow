import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SidebarFooter from '../../../../src/components/sidebar/SidebarFooter.vue'

describe('SidebarFooter', () => {
  function mountFooter() {
    return mount(SidebarFooter, {
      global: {
        stubs: {
          AppIcon: {
            props: ['name', 'size'],
            template: '<span class="app-icon-stub" :data-name="name"></span>',
          },
        },
      },
    })
  }

  it('设置与帮助应为图标加文字，点击分别发出 openSettings / openHelp', async () => {
    const wrapper = mountFooter()
    const icons = wrapper.findAll('.app-icon-stub').map((el) => el.attributes('data-name'))

    expect(icons).toEqual(['settings', 'help'])
    expect(wrapper.get('[data-testid="sidebar-settings"]').text()).toContain('设置')
    expect(wrapper.get('[data-testid="sidebar-help"]').text()).toContain('帮助与反馈')
    expect(wrapper.find('[data-testid="sidebar-storage-caption"]').exists()).toBe(false)

    await wrapper.get('[data-testid="sidebar-settings"]').trigger('click')
    await wrapper.get('[data-testid="sidebar-help"]').trigger('click')
    expect(wrapper.emitted('openSettings')).toHaveLength(1)
    expect(wrapper.emitted('openHelp')).toHaveLength(1)
  })
})

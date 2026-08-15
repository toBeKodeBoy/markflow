import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SidebarFooter from '../../../../src/components/sidebar/SidebarFooter.vue'

describe('SidebarFooter', () => {
  it('设置行应带 settings 图标，点击发出 openSettings', async () => {
    const wrapper = mount(SidebarFooter, {
      props: { caption: '数据：uTools 本地数据库' },
      global: {
        stubs: {
          AppIcon: {
            props: ['name', 'size'],
            template: '<span class="app-icon-stub" :data-name="name"></span>',
          },
        },
      },
    })

    expect(wrapper.get('.app-icon-stub').attributes('data-name')).toBe('settings')
    expect(wrapper.get('[data-testid="sidebar-settings"]').text()).toContain('设置')
    expect(wrapper.get('[data-testid="sidebar-storage-caption"]').text()).toBe(
      '数据：uTools 本地数据库',
    )

    await wrapper.get('[data-testid="sidebar-settings"]').trigger('click')
    expect(wrapper.emitted('openSettings')).toHaveLength(1)
  })
})

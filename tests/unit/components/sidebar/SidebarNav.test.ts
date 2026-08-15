import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SidebarNav from '../../../../src/components/sidebar/SidebarNav.vue'

function mountNav(active: 'home' | 'docs' | 'trash' = 'home', trashCount = 0) {
  return mount(SidebarNav, {
    props: { active, trashCount },
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

describe('SidebarNav', () => {
  it('三项导航分别使用 home / file / trash 图标', () => {
    const wrapper = mountNav('home', 2)
    const icons = wrapper.findAll('.app-icon-stub').map((el) => el.attributes('data-name'))
    expect(icons).toEqual(['home', 'file', 'trash'])
    expect(wrapper.get('[data-testid="sidebar-nav-home"]').text()).toContain('首页')
    expect(wrapper.get('[data-testid="sidebar-nav-docs"]').text()).toContain('文档')
    expect(wrapper.get('[data-testid="sidebar-nav-trash"]').text()).toContain('回收站')
    expect(wrapper.get('.trash-badge').text()).toBe('2')
  })

  it('点击导航项发出对应 select', async () => {
    const wrapper = mountNav()
    await wrapper.get('[data-testid="sidebar-nav-docs"]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['docs']])
  })
})

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OnboardingCoach from '../../../src/components/OnboardingCoach.vue'

describe('OnboardingCoach', () => {
  it('渲染当前步骤文案、进度与不再展示勾选', async () => {
    const wrapper = mount(OnboardingCoach, {
      props: { step: 1, total: 3 },
    })

    expect(wrapper.find('[data-testid="onboarding-coach"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('点击创建第一篇 Markdown 文档')
    expect(wrapper.text()).not.toContain('笔记')
    expect(wrapper.text()).toContain('1 / 3')
    expect(wrapper.find('[data-testid="onboarding-skip"]').exists()).toBe(true)

    await wrapper.find('[data-testid="onboarding-skip"]').trigger('click')
    expect(wrapper.emitted('skip')).toHaveLength(1)

    await wrapper.find('[data-testid="onboarding-next"]').trigger('click')
    expect(wrapper.emitted('next')).toHaveLength(1)

    await wrapper.find('[data-testid="onboarding-dismiss"]').setValue(true)
    expect(wrapper.emitted('dismiss')).toHaveLength(1)
  })

  it('后续步骤不再强调笔记，并与本地保存 / 搜索文档锚点一致', () => {
    const step2 = mount(OnboardingCoach, { props: { step: 2, total: 3 } })
    expect(step2.text()).toContain('所有文档自动保存在本地')
    expect(step2.text()).not.toContain('笔记')

    const step3 = mount(OnboardingCoach, { props: { step: 3, total: 3 } })
    expect(step3.text()).toContain('搜索文档')
    expect(step3.text()).not.toContain('笔记')
  })
})

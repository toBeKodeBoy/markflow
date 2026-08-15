import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OnboardingCoach from '../../../src/components/OnboardingCoach.vue'

describe('OnboardingCoach', () => {
  it('渲染当前步骤文案、进度与不再展示勾选', async () => {
    const wrapper = mount(OnboardingCoach, {
      props: { step: 1, total: 3 },
    })

    expect(wrapper.find('[data-testid="onboarding-coach"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('点击创建第一篇 Markdown 笔记')
    expect(wrapper.text()).toContain('1 / 3')
    expect(wrapper.find('[data-testid="onboarding-skip"]').exists()).toBe(true)

    await wrapper.find('[data-testid="onboarding-skip"]').trigger('click')
    expect(wrapper.emitted('skip')).toHaveLength(1)

    await wrapper.find('[data-testid="onboarding-next"]').trigger('click')
    expect(wrapper.emitted('next')).toHaveLength(1)

    await wrapper.find('[data-testid="onboarding-dismiss"]').setValue(true)
    expect(wrapper.emitted('dismiss')).toHaveLength(1)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { computed } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useOnboarding } from '../../../src/composables/useOnboarding'
import { useAppSettings } from '../../../src/composables/useAppSettings'

describe('useOnboarding', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    useAppSettings().load()
  })

  it('空库、无 Tab、未关闭时应当展示', () => {
    const { visible } = useOnboarding({
      emptyLibrary: computed(() => true),
      hasOpenTabs: computed(() => false),
    })
    expect(visible.value).toBe(true)
  })

  it('有笔记或已打开 Tab 时不展示', () => {
    const withNotes = useOnboarding({
      emptyLibrary: computed(() => false),
      hasOpenTabs: computed(() => false),
    })
    const withTabs = useOnboarding({
      emptyLibrary: computed(() => true),
      hasOpenTabs: computed(() => true),
    })
    expect(withNotes.visible.value).toBe(false)
    expect(withTabs.visible.value).toBe(false)
  })

  it('跳过或勾选不再展示后持久化关闭', () => {
    const onboarding = useOnboarding({
      emptyLibrary: computed(() => true),
      hasOpenTabs: computed(() => false),
    })
    onboarding.dismiss()
    expect(useAppSettings().get().onboardingDismissed).toBe(true)
    expect(onboarding.visible.value).toBe(false)
  })

  it('下一步从 1 走到 3，再前进一步则关闭引导', () => {
    const onboarding = useOnboarding({
      emptyLibrary: computed(() => true),
      hasOpenTabs: computed(() => false),
    })
    expect(onboarding.step.value).toBe(1)
    onboarding.next()
    expect(onboarding.step.value).toBe(2)
    onboarding.next()
    expect(onboarding.step.value).toBe(3)
    onboarding.next()
    expect(useAppSettings().get().onboardingDismissed).toBe(true)
    expect(onboarding.visible.value).toBe(false)
  })
})

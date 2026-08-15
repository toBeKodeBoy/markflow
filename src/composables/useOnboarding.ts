import { computed, ref, type ComputedRef } from 'vue'
import { useAppSettings } from './useAppSettings'

const TOTAL_STEPS = 3

export function useOnboarding(options: {
  emptyLibrary: ComputedRef<boolean>
  hasOpenTabs: ComputedRef<boolean>
}) {
  const appSettings = useAppSettings()
  const step = ref(1)

  const visible = computed(() => (
    appSettings.get().onboardingDismissed !== true
    && options.emptyLibrary.value
    && !options.hasOpenTabs.value
  ))

  function dismiss() {
    appSettings.save({ onboardingDismissed: true })
  }

  function next() {
    if (step.value >= TOTAL_STEPS) {
      dismiss()
      return
    }
    step.value += 1
  }

  return { visible, step, dismiss, next }
}

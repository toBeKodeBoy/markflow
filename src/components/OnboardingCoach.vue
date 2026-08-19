<template>
  <div
    v-if="visible"
    class="onboarding-coach"
    data-testid="onboarding-coach"
  >
    <div class="onboarding-bubble">
      <span class="onboarding-step-badge">{{ step }}</span>
      <p>{{ currentCopy }}</p>
    </div>
    <div class="onboarding-controls">
      <span>{{ step }} / {{ total }}</span>
      <button
        type="button"
        data-testid="onboarding-next"
        @click="emit('next')"
      >
        {{ step >= total ? '完成' : '下一步' }}
      </button>
      <button
        type="button"
        data-testid="onboarding-skip"
        @click="emit('skip')"
      >
        跳过
      </button>
      <label>
        <input
          type="checkbox"
          data-testid="onboarding-dismiss"
          @change="onDismissChange"
        >
        不再展示新手引导
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ONBOARDING_COPY } from '../constants/emptyHomeCopy'

const props = withDefaults(defineProps<{
  step?: number
  total?: number
  visible?: boolean
}>(), {
  step: 1,
  total: 3,
  visible: true,
})

const emit = defineEmits<{
  skip: []
  dismiss: []
  next: []
}>()

const currentCopy = computed(() => ONBOARDING_COPY[Math.max(0, props.step - 1)] ?? ONBOARDING_COPY[0])

function onDismissChange(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  if (checked) emit('dismiss')
}
</script>

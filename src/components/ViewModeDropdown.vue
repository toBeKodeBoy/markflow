<template>
  <div
    class="view-mode-dropdown"
    :class="{ 'is-drop-up': placement === 'top' }"
    data-testid="view-mode-dropdown"
    ref="rootRef"
  >
    <button
      type="button"
      class="view-mode-dropdown-trigger"
      data-testid="view-mode-dropdown-trigger"
      :title="`视图模式：${current.label}`"
      :aria-label="`视图模式：${current.label}`"
      :aria-expanded="menuOpen"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <AppIcon :name="current.icon" :size="14" />
      <span class="view-mode-dropdown-label">{{ current.label }}</span>
      <AppIcon name="chevron-down" :size="12" />
    </button>
    <div
      v-if="menuOpen"
      class="view-mode-dropdown-menu"
      data-testid="view-mode-dropdown-menu"
      role="listbox"
      aria-label="编辑模式"
    >
      <button
        v-for="item in MODE_ITEMS"
        :key="item.mode"
        type="button"
        role="option"
        :data-testid="`view-mode-option-${item.mode}`"
        :class="{ active: viewMode === item.mode }"
        :aria-selected="viewMode === item.mode"
        @click="select(item.mode)"
      >
        <span class="view-mode-option-main">
          <AppIcon :name="item.icon" :size="14" />
          <span>{{ item.label }}</span>
        </span>
        <span class="view-mode-shortcut">{{ item.shortcut }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import type { ViewMode } from '../types'
import AppIcon, { type AppIconName } from './AppIcon.vue'
import { useViewModeFlash } from '../composables/useViewModeFlash'

const FLASH_MS = 200

const MODE_ITEMS: { mode: ViewMode; label: string; shortcut: string; icon: AppIconName }[] = [
  { mode: 'live', label: '预览', shortcut: 'Ctrl+Shift+J', icon: 'view-live' },
  { mode: 'split', label: '分屏', shortcut: 'Ctrl+Shift+K', icon: 'view-split' },
  { mode: 'source', label: '源码', shortcut: 'Ctrl+Shift+L', icon: 'view-source' },
  { mode: 'focus', label: '专注', shortcut: 'Ctrl+Shift+M', icon: 'view-focus' },
]

const props = withDefaults(
  defineProps<{
    viewMode: ViewMode
    placement?: 'top' | 'bottom'
  }>(),
  { placement: 'bottom' },
)

const emit = defineEmits<{
  setViewMode: [mode: ViewMode]
  'update:open': [open: boolean]
}>()

const menuOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const flashTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const flashRegistry = useViewModeFlash()
let unregisterFlash: (() => void) | null = null

const current = computed(
  () => MODE_ITEMS.find((item) => item.mode === props.viewMode) ?? MODE_ITEMS[0],
)

function clearFlash() {
  if (flashTimer.value != null) {
    clearTimeout(flashTimer.value)
    flashTimer.value = null
  }
}

function setOpen(value: boolean) {
  menuOpen.value = value
  emit('update:open', value)
}

function toggle() {
  clearFlash()
  setOpen(!menuOpen.value)
}

function select(mode: ViewMode) {
  emit('setViewMode', mode)
  setOpen(false)
  clearFlash()
}

function flashFeedback() {
  clearFlash()
  setOpen(true)
  flashTimer.value = setTimeout(() => {
    setOpen(false)
    flashTimer.value = null
  }, FLASH_MS)
}

function onDocPointerDown(e: PointerEvent) {
  if (!menuOpen.value) return
  const el = rootRef.value
  if (el && e.target instanceof Node && !el.contains(e.target)) {
    setOpen(false)
  }
}

watch(menuOpen, (value) => {
  if (!value) clearFlash()
})

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown, true)
  unregisterFlash = flashRegistry?.register(flashFeedback) ?? null
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  clearFlash()
  unregisterFlash?.()
})

defineExpose({ flashFeedback })
</script>

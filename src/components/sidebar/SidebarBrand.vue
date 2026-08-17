<template>
  <div class="sidebar-brand" data-testid="sidebar-brand">
    <button
      type="button"
      class="sidebar-logo"
      data-testid="sidebar-logo"
      title="首页"
      aria-label="首页"
      @click="emit('navigateHome')"
    >
      <span class="logo-mark">M</span>
      <span class="logo-name">MarkFlow</span>
    </button>
    <button
      type="button"
      class="btn-primary sidebar-create-note"
      data-testid="sidebar-create-note"
      data-onboarding="create"
      @click="emit('createNote')"
    >
      <AppIcon name="plus" :size="16" />
      {{ SIDEBAR_CREATE_NOTE_LABEL }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { SIDEBAR_CREATE_NOTE_LABEL } from '../../constants/sidebarShell'
import AppIcon from '../AppIcon.vue'

const emit = defineEmits<{
  createNote: []
  navigateHome: []
}>()
</script>

<style scoped>
.sidebar-brand {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px var(--sidebar-pad-x) 10px;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.logo-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--primary);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.sidebar-create-note {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: var(--sidebar-create-h);
  border-radius: var(--sidebar-item-radius);
}
</style>

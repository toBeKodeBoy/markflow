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
      <span class="logo-icon">M↓</span>
      <span class="logo-name">MarkFlow</span>
    </button>
    <button
      type="button"
      class="btn-primary sidebar-create-note"
      data-testid="sidebar-create-note"
      data-onboarding="create"
      @click="emit('createNote')"
    >
      {{ SIDEBAR_CREATE_NOTE_LABEL }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { SIDEBAR_CREATE_NOTE_LABEL } from '../../constants/sidebarShell'

const emit = defineEmits<{
  createNote: []
  navigateHome: []
}>()
</script>

<style scoped>
.sidebar-brand {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 12px 12px;
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

.sidebar-create-note {
  width: 100%;
  justify-content: center;
  border-radius: 10px;
  height: 40px;
}
</style>

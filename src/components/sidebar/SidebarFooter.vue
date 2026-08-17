<template>
  <div class="sidebar-footer">
    <button
      type="button"
      class="sidebar-footer-item"
      data-testid="sidebar-settings"
      :title="SIDEBAR_SETTINGS_LABEL"
      :aria-label="SIDEBAR_SETTINGS_LABEL"
      @click="emit('openSettings')"
    >
      <AppIcon name="settings" :size="16" />
      <span>{{ SIDEBAR_SETTINGS_LABEL }}</span>
    </button>
    <button
      type="button"
      class="sidebar-footer-item"
      data-testid="sidebar-help"
      :title="SIDEBAR_HELP_LABEL"
      :aria-label="SIDEBAR_HELP_LABEL"
      @click="emit('openHelp')"
    >
      <AppIcon name="help" :size="16" />
      <span>{{ SIDEBAR_HELP_LABEL }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '../AppIcon.vue'
import { SIDEBAR_HELP_LABEL, SIDEBAR_SETTINGS_LABEL } from '../../constants/sidebarShell'

const emit = defineEmits<{
  openSettings: []
  openHelp: []
}>()
</script>

<style scoped>
.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--sidebar-section-y) 8px 10px;
  border-top: 1px solid var(--border-color, var(--border));
  background: var(--bg-secondary, var(--bg-sidebar));
}

.sidebar-footer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: var(--sidebar-item-py) var(--sidebar-pad-x);
  border: 0;
  border-radius: var(--sidebar-item-radius);
  background: transparent;
  color: var(--text-secondary, var(--text));
  text-align: left;
  cursor: pointer;
}

.sidebar-footer-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary, var(--text));
}
</style>

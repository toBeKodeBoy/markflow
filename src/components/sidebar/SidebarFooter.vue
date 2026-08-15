<template>
  <div class="sidebar-footer">
    <button
      type="button"
      class="sidebar-footer-settings"
      data-testid="sidebar-settings"
      @click="emit('openSettings')"
    >
      <AppIcon name="settings" :size="16" />
      {{ SIDEBAR_SETTINGS_LABEL }}
    </button>
    <p data-testid="sidebar-storage-caption" class="sidebar-storage-caption">{{ caption }}</p>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '../AppIcon.vue'
import { SIDEBAR_SETTINGS_LABEL } from '../../constants/sidebarShell'

defineProps<{
  caption: string
}>()

const emit = defineEmits<{
  openSettings: []
}>()
</script>

<style scoped>
.sidebar-footer {
  padding: var(--sidebar-section-y);
  border-top: 1px solid var(--border-color, var(--border));
  background: var(--bg-secondary, var(--bg-sidebar));
}

.sidebar-footer-settings {
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

.sidebar-footer-settings:hover {
  background: var(--bg-hover);
}

.sidebar-storage-caption {
  margin: 6px 4px 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--text-muted, var(--text-secondary));
}
</style>

<template>
  <div class="sidebar-footer">
    <button
      type="button"
      class="sidebar-footer-settings"
      data-testid="sidebar-settings"
      @click="emit('openSettings')"
    >
      {{ SIDEBAR_SETTINGS_LABEL }}
    </button>
    <p data-testid="sidebar-storage-caption" class="sidebar-storage-caption">{{ caption }}</p>
  </div>
</template>

<script setup lang="ts">
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
  padding: 8px;
  border-top: 1px solid var(--border-color, var(--border));
  background: var(--bg-secondary, var(--bg-sidebar));
}

.sidebar-footer-settings {
  width: 100%;
  padding: 7px 10px;
  border: 0;
  border-radius: 8px;
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

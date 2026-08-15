<template>
  <nav class="sidebar-nav" data-testid="sidebar-nav">
    <button
      type="button"
      class="sidebar-nav-item"
      data-testid="sidebar-nav-home"
      :class="{ active: active === 'home' }"
      @click="emit('select', 'home')"
    >
      {{ SIDEBAR_NAV_HOME }}
    </button>
    <button
      type="button"
      class="sidebar-nav-item"
      data-testid="sidebar-nav-docs"
      :class="{ active: active === 'docs' }"
      @click="emit('select', 'docs')"
    >
      {{ SIDEBAR_NAV_DOCS }}
    </button>
    <button
      type="button"
      class="sidebar-nav-item"
      data-testid="sidebar-nav-trash"
      :class="{ active: active === 'trash' }"
      @click="emit('select', 'trash')"
    >
      <span>{{ SIDEBAR_NAV_TRASH }}</span>
      <span v-if="trashCount > 0" class="trash-badge">{{ trashCount }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import {
  SIDEBAR_NAV_DOCS,
  SIDEBAR_NAV_HOME,
  SIDEBAR_NAV_TRASH,
} from '../../constants/sidebarShell'
import type { SidebarNavId } from './types'

defineProps<{
  active: SidebarNavId
  trashCount: number
}>()

const emit = defineEmits<{
  select: [id: SidebarNavId]
}>()
</script>

<style scoped>
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 8px 12px;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 9px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, var(--text));
  text-align: left;
  cursor: pointer;
}

.sidebar-nav-item:hover {
  background: var(--bg-hover);
}

.sidebar-nav-item.active {
  background: var(--bg-active, var(--bg-hover));
  color: var(--primary);
  box-shadow: inset 2px 0 0 var(--primary);
}

.trash-badge {
  background: var(--color-danger, #e5484d);
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}
</style>

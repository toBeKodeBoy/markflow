<template>
  <nav class="sidebar-nav" data-testid="sidebar-nav">
    <button
      type="button"
      class="sidebar-nav-item"
      data-testid="sidebar-nav-home"
      :class="{ active: active === 'home' }"
      @click="emit('select', 'home')"
    >
      <AppIcon name="home" :size="16" />
      <span>{{ SIDEBAR_NAV_HOME }}</span>
    </button>
    <button
      type="button"
      class="sidebar-nav-item"
      data-testid="sidebar-nav-docs"
      :class="{ active: active === 'docs' }"
      @click="emit('select', 'docs')"
    >
      <AppIcon name="file" :size="16" />
      <span>{{ SIDEBAR_NAV_DOCS }}</span>
    </button>
    <button
      type="button"
      class="sidebar-nav-item"
      data-testid="sidebar-nav-trash"
      :class="{ active: active === 'trash' }"
      @click="emit('select', 'trash')"
    >
      <AppIcon name="trash" :size="16" />
      <span>{{ SIDEBAR_NAV_TRASH }}</span>
      <span v-if="trashCount > 0" class="trash-badge">{{ trashCount }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import AppIcon from '../AppIcon.vue'
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
  gap: var(--sidebar-item-gap);
  padding: 2px 8px 8px;
}

.sidebar-nav-item {
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

.sidebar-nav-item:hover {
  background: var(--bg-hover);
}

.sidebar-nav-item.active {
  background: var(--bg-active, var(--bg-hover));
  color: var(--primary);
}

.trash-badge {
  margin-left: auto;
  background: var(--color-danger, #e5484d);
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}
</style>

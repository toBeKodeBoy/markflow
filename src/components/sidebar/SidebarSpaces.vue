<template>
  <section class="sidebar-spaces" data-testid="sidebar-spaces">
    <div class="sidebar-spaces-header">
      <span>{{ SIDEBAR_SPACES_TITLE }}</span>
      <button
        type="button"
        class="sidebar-space-add"
        data-testid="sidebar-space-add"
        title="新建空间（顶层文件夹）"
        @click="emit('createSpace')"
      >
        +
      </button>
    </div>
    <button
      type="button"
      class="sidebar-space-item"
      data-testid="sidebar-space-my"
      :class="{ active: !activeSpaceId }"
      @click="emit('select', null)"
    >
      {{ SIDEBAR_MY_SPACE_LABEL }}
    </button>
    <button
      v-for="folder in spaces"
      :key="folder.id"
      type="button"
      class="sidebar-space-item"
      data-testid="sidebar-space-item"
      :class="{ active: activeSpaceId === folder.id }"
      :title="folder.name"
      @click="emit('select', folder.id)"
    >
      {{ folder.name }}
    </button>
  </section>
</template>

<script setup lang="ts">
import type { Folder } from '../../types'
import { SIDEBAR_MY_SPACE_LABEL, SIDEBAR_SPACES_TITLE } from '../../constants/sidebarShell'

defineProps<{
  spaces: Folder[]
  activeSpaceId: string | null
}>()

const emit = defineEmits<{
  select: [id: string | null]
  createSpace: []
}>()
</script>

<style scoped>
.sidebar-spaces {
  display: flex;
  flex-direction: column;
  gap: var(--sidebar-space-gap);
  padding: var(--sidebar-section-y) 8px;
  border-top: 1px solid var(--border, var(--border-color));
  border-bottom: 1px solid var(--border, var(--border-color));
}

.sidebar-spaces-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px var(--sidebar-pad-x) 2px;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--text-muted, var(--text-secondary));
}

.sidebar-space-add {
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.sidebar-space-add:hover {
  background: var(--bg-hover);
}

.sidebar-space-item {
  display: block;
  width: 100%;
  padding: var(--sidebar-item-py) var(--sidebar-pad-x);
  border: 0;
  border-radius: var(--sidebar-item-radius);
  background: transparent;
  color: var(--text-secondary, var(--text));
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.sidebar-space-item:hover {
  background: var(--bg-hover);
}

.sidebar-space-item.active {
  background: var(--bg-active, var(--bg-hover));
  color: var(--primary);
}
</style>

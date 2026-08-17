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

    <div class="sidebar-space-list">
      <div class="sidebar-space-row" :class="{ active: !props.activeSpaceId }">
        <button
          type="button"
          class="sidebar-space-select"
          data-testid="sidebar-space-my"
          @click="emit('select', null)"
        >
          <AppIcon name="folder" :size="14" />
          {{ SIDEBAR_MY_SPACE_LABEL }}
        </button>
        <button
          type="button"
          class="sidebar-space-toggle"
          data-testid="sidebar-space-my-toggle"
          :aria-expanded="props.myExpanded"
          :aria-label="props.myExpanded ? '收起我的空间' : '展开我的空间'"
          @click.stop="emit('toggle', null)"
        >
          <AppIcon :name="props.myExpanded ? 'chevron-down' : 'chevron-right'" :size="12" />
        </button>
      </div>
      <div v-if="props.myExpanded" class="sidebar-space-body" data-testid="sidebar-space-body-my">
        <slot name="body" :space="null" />
      </div>

      <template v-for="space in props.spaces" :key="space.id">
        <div
          class="sidebar-space-row"
          :class="{ active: props.activeSpaceId === space.id }"
          @contextmenu.prevent="emit('folderContext', $event, space.id)"
        >
          <button
            type="button"
            class="sidebar-space-select"
            :data-testid="`sidebar-space-item-${space.id}`"
            :title="space.name"
            @click="emit('select', space.id)"
          >
            <AppIcon name="folder" :size="14" />
            {{ space.name }}
          </button>
          <button
            type="button"
            class="sidebar-space-toggle"
            :data-testid="`sidebar-space-toggle-${space.id}`"
            :aria-expanded="props.expandedSpaceIds.has(space.id)"
            :aria-label="props.expandedSpaceIds.has(space.id) ? `收起 ${space.name}` : `展开 ${space.name}`"
            @click.stop="emit('toggle', space.id)"
          >
            <AppIcon :name="props.expandedSpaceIds.has(space.id) ? 'chevron-down' : 'chevron-right'" :size="12" />
          </button>
        </div>
        <div v-if="props.expandedSpaceIds.has(space.id)" class="sidebar-space-body" :data-testid="`sidebar-space-body-${space.id}`">
          <slot name="body" :space="space" />
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import AppIcon from '../AppIcon.vue'
import type { Folder } from '../../types'
import { SIDEBAR_MY_SPACE_LABEL, SIDEBAR_SPACES_TITLE } from '../../constants/sidebarShell'

const props = withDefaults(
  defineProps<{
    spaces: Folder[]
    activeSpaceId: string | null
    expandedSpaceIds: Set<string>
    myExpanded: boolean
  }>(),
  {
    activeSpaceId: null,
    myExpanded: true,
  }
)

const emit = defineEmits<{
  select: [id: string | null]
  toggle: [id: string | null]
  folderContext: [event: MouseEvent, id: string]
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

.sidebar-space-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-space-row {
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: var(--sidebar-item-radius);
}

.sidebar-space-row:hover {
  background: var(--bg-hover);
}

.sidebar-space-row.active {
  background: var(--bg-active, var(--bg-hover));
  color: var(--primary);
}

.sidebar-space-select {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: var(--sidebar-item-py) var(--sidebar-pad-x);
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.sidebar-space-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  flex-shrink: 0;
}

.sidebar-space-toggle:hover {
  background: color-mix(in srgb, currentColor 10%, transparent);
}
</style>

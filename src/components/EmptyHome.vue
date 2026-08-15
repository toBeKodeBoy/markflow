<template>
  <div data-testid="empty-tabs-state" class="empty-tabs-state">
    <h2 class="empty-tabs-title">{{ EMPTY_HOME_TITLE }}</h2>
    <p class="empty-tabs-text">{{ EMPTY_HOME_SUBTITLE }}</p>
    <div class="empty-tabs-actions">
      <button
        type="button"
        class="btn-primary"
        data-testid="empty-home-create"
        @click="emit('create')"
      >
        {{ EMPTY_HOME_CREATE_LABEL }}
      </button>
      <button
        type="button"
        data-testid="empty-home-import"
        @click="emit('import')"
      >
        {{ EMPTY_HOME_IMPORT_LABEL }}
      </button>
      <button
        type="button"
        data-testid="empty-home-open-sidebar"
        :class="{ active: sidebarVisible }"
        :aria-pressed="sidebarVisible"
        @click="emit('toggleSidebar')"
      >
        {{ sidebarVisible ? EMPTY_HOME_CLOSE_SIDEBAR_LABEL : EMPTY_HOME_OPEN_SIDEBAR_LABEL }}
      </button>
    </div>
    <p class="empty-home-storage-hint">{{ EMPTY_HOME_STORAGE_HINT }}</p>
    <p class="empty-tabs-text">{{ EMPTY_HOME_SIDEBAR_HINT }}</p>

    <section data-testid="empty-home-templates" class="empty-home-templates">
      <h3 class="empty-home-templates-title">{{ EMPTY_HOME_TEMPLATES_TITLE }}</h3>
      <div class="empty-home-template-grid">
        <button
          v-for="item in NOTE_TEMPLATES"
          :key="item.id"
          type="button"
          class="empty-home-template-card"
          data-testid="empty-home-template-card"
          @click="emit('useTemplate', item.id)"
        >
          <span
            class="empty-home-template-icon"
            :class="'tone-' + item.iconTone"
            data-testid="empty-home-template-icon"
          >
            <AppIcon :name="item.icon" :size="18" />
          </span>
          <strong>{{ item.title }}</strong>
          <span>{{ item.description }}</span>
          <em>一键创建</em>
        </button>
      </div>
    </section>

    <ul v-if="emptyLibrary" data-testid="empty-home-hints" class="empty-home-hints">
      <li>
        <span data-testid="empty-home-hint-icon" class="empty-home-hint-icon">
          <AppIcon name="info" :size="14" />
        </span>
        <span>{{ EMPTY_HOME_HINT_EXPORT }}</span>
      </li>
      <li>
        <span data-testid="empty-home-hint-icon" class="empty-home-hint-icon">
          <AppIcon name="info" :size="14" />
        </span>
        <span>{{ EMPTY_HOME_HINT_THEME }}</span>
      </li>
      <li>
        <span data-testid="empty-home-hint-icon" class="empty-home-hint-icon">
          <AppIcon name="info" :size="14" />
        </span>
        <span>{{ EMPTY_HOME_HINT_FOLDER_COUNT }}</span>
      </li>
    </ul>

    <button
      v-if="emptyLibrary"
      type="button"
      class="empty-home-example-link"
      data-testid="empty-home-example-library"
      @click="emit('importExample')"
    >
      {{ EMPTY_HOME_EXAMPLE_LIBRARY_LABEL }}
    </button>
  </div>
</template>

<script setup lang="ts">
import {
  EMPTY_HOME_CREATE_LABEL,
  EMPTY_HOME_EXAMPLE_LIBRARY_LABEL,
  EMPTY_HOME_HINT_EXPORT,
  EMPTY_HOME_HINT_FOLDER_COUNT,
  EMPTY_HOME_HINT_THEME,
  EMPTY_HOME_IMPORT_LABEL,
  EMPTY_HOME_CLOSE_SIDEBAR_LABEL,
  EMPTY_HOME_OPEN_SIDEBAR_LABEL,
  EMPTY_HOME_SIDEBAR_HINT,
  EMPTY_HOME_STORAGE_HINT,
  EMPTY_HOME_SUBTITLE,
  EMPTY_HOME_TEMPLATES_TITLE,
  EMPTY_HOME_TITLE,
} from '../constants/emptyHomeCopy'
import { NOTE_TEMPLATES, type NoteTemplateId } from '../constants/noteTemplates'
import AppIcon from './AppIcon.vue'

defineProps<{
  emptyLibrary: boolean
  sidebarVisible: boolean
}>()

const emit = defineEmits<{
  create: []
  import: []
  toggleSidebar: []
  useTemplate: [id: NoteTemplateId]
  importExample: []
}>()
</script>

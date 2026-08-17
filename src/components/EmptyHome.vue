<template>
  <div data-testid="empty-tabs-state" class="empty-tabs-state">
    <div class="empty-home-hero">
      <h2 class="empty-tabs-title">{{ EMPTY_HOME_TITLE }}</h2>
      <p class="empty-tabs-text">{{ EMPTY_HOME_SUBTITLE }}</p>
      <div class="empty-tabs-actions">
        <button
          type="button"
          class="btn-primary"
          data-testid="empty-home-create"
          @click="emit('create')"
        >
          <AppIcon name="plus" :size="16" />
          {{ EMPTY_HOME_CREATE_LABEL }}
        </button>
        <button
          type="button"
          data-testid="empty-home-create-folder"
          @click="emit('createFolder')"
        >
          <AppIcon name="folder" :size="16" />
          {{ EMPTY_HOME_CREATE_FOLDER_LABEL }}
        </button>
        <button
          type="button"
          data-testid="empty-home-import"
          @click="emit('import')"
        >
          <AppIcon name="upload" :size="16" />
          {{ EMPTY_HOME_IMPORT_LABEL }}
        </button>
      </div>
      <p class="empty-home-storage-hint">{{ EMPTY_HOME_STORAGE_HINT }}</p>
    </div>

    <section data-testid="empty-home-templates" class="empty-home-templates">
      <h3 class="empty-home-templates-title">{{ EMPTY_HOME_TEMPLATES_TITLE }}</h3>
      <div class="empty-home-template-grid">
        <button
          v-for="item in NOTE_TEMPLATES"
          :key="item.id"
          type="button"
          class="empty-home-template-card"
          :class="'tone-' + item.iconTone"
          data-testid="empty-home-template-card"
          @click="emit('useTemplate', item.id)"
        >
          <span class="empty-home-template-body">
            <span
              class="empty-home-template-icon"
              :class="'tone-' + item.iconTone"
              data-testid="empty-home-template-icon"
            >
              <AppIcon :name="item.icon" :size="24" />
            </span>
            <strong>{{ item.title }}</strong>
            <span class="empty-home-template-desc">{{ item.description }}</span>
          </span>
          <span class="empty-home-template-cta" data-testid="empty-home-template-cta">一键创建</span>
        </button>
      </div>
    </section>

    <div v-if="emptyLibrary" class="empty-home-footer">
      <button
        type="button"
        class="empty-home-example-link"
        data-testid="empty-home-example-library"
        @click="emit('importExample')"
      >
        <AppIcon name="download" :size="14" />
        {{ EMPTY_HOME_EXAMPLE_LIBRARY_LABEL }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  EMPTY_HOME_CREATE_FOLDER_LABEL,
  EMPTY_HOME_CREATE_LABEL,
  EMPTY_HOME_EXAMPLE_LIBRARY_LABEL,
  EMPTY_HOME_IMPORT_LABEL,
  EMPTY_HOME_STORAGE_HINT,
  EMPTY_HOME_SUBTITLE,
  EMPTY_HOME_TEMPLATES_TITLE,
  EMPTY_HOME_TITLE,
} from '../constants/emptyHomeCopy'
import { NOTE_TEMPLATES, type NoteTemplateId } from '../constants/noteTemplates'
import AppIcon from './AppIcon.vue'

defineProps<{
  emptyLibrary: boolean
}>()

const emit = defineEmits<{
  create: []
  createFolder: []
  import: []
  useTemplate: [id: NoteTemplateId]
  importExample: []
}>()
</script>

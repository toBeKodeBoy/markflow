<template>
  <div data-testid="empty-tabs-state" class="empty-tabs-state">
    <div class="empty-home-brand" aria-hidden="true">
      <span data-testid="empty-home-mark" class="empty-home-mark">M</span>
    </div>
    <div data-testid="empty-home-commands" class="empty-home-commands">
      <button
        type="button"
        class="empty-home-command"
        data-testid="empty-home-create"
        @click="emit('create')"
      >
        <span>{{ EMPTY_HOME_CREATE_LABEL }}</span>
        <span class="empty-home-command-keys">
          <kbd>Ctrl</kbd>
          <span>+</span>
          <kbd>N</kbd>
        </span>
      </button>
      <button
        type="button"
        class="empty-home-command"
        data-testid="empty-home-search"
        @click="emit('openSearch')"
      >
        <span>{{ EMPTY_HOME_SEARCH_LABEL }}</span>
        <span class="empty-home-command-keys">
          <kbd>Ctrl</kbd>
          <span>+</span>
          <kbd>K</kbd>
        </span>
      </button>
      <button
        type="button"
        class="empty-home-command"
        data-testid="empty-home-settings"
        @click="emit('openSettings')"
      >
        <span>{{ EMPTY_HOME_SETTINGS_LABEL }}</span>
        <span class="empty-home-command-keys">
          <kbd>Ctrl</kbd>
          <span>+</span>
          <kbd>Alt</kbd>
          <span>+</span>
          <kbd>S</kbd>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  EMPTY_HOME_CREATE_LABEL,
  EMPTY_HOME_SEARCH_LABEL,
  EMPTY_HOME_SETTINGS_LABEL,
} from '../constants/emptyHomeCopy'

const emit = defineEmits<{
  create: []
  openSearch: []
  openSettings: []
}>()
</script>

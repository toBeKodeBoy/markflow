<template>
  <div class="editor-tab-bar" role="tablist" aria-label="打开的笔记">
    <div ref="scrollRef" class="editor-tab-bar-scroll">
      <button
        v-for="tab in tabsStore.tabs"
        :key="tab.noteId"
        type="button"
        role="tab"
        :class="['editor-tab', { active: tab.noteId === tabsStore.activeTabId, dirty: tabsStore.isTabDirtyForTab(tab) }]"
        :aria-selected="tab.noteId === tabsStore.activeTabId"
        @click="onActivate(tab.noteId)"
        @auxclick="onAuxClick($event, tab.noteId)"
      >
        <span class="editor-tab-title" :title="tabsStore.getTabDisplayTitle(tab)">
          {{ tabsStore.getTabDisplayTitle(tab) }}
        </span>
        <span v-if="tabsStore.isTabDirtyForTab(tab)" class="editor-tab-dirty" aria-hidden="true">•</span>
        <span
          class="editor-tab-close"
          role="button"
          tabindex="-1"
          title="关闭标签页"
          aria-label="关闭标签页"
          @click.stop="onClose(tab.noteId)"
        >
          <AppIcon name="close" :size="12" />
        </span>
      </button>
    </div>
    <button
      type="button"
      class="editor-tab-add btn-icon"
      title="新建笔记"
      aria-label="新建笔记"
      @click="onCreate"
    >
      <AppIcon name="plus" :size="14" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useEditorTabsStore } from '../stores/editorTabs'
import { useNoteStore } from '../stores/note'
import AppIcon from './AppIcon.vue'

const tabsStore = useEditorTabsStore()
const noteStore = useNoteStore()
const scrollRef = ref<HTMLElement>()

function onActivate(noteId: string) {
  tabsStore.activateTab(noteId)
}

function onClose(noteId: string) {
  tabsStore.closeTab(noteId)
}

function onAuxClick(e: MouseEvent, noteId: string) {
  if (e.button === 1) {
    e.preventDefault()
    tabsStore.closeTab(noteId)
  }
}

function onCreate() {
  const note = noteStore.createNote(noteStore.activeFolderId ?? undefined)
  tabsStore.openTabForNewNote(note.id)
}
</script>

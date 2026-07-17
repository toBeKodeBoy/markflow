<template>
  <div class="editor-tab-bar" role="tablist" aria-label="打开的笔记">
    <div class="editor-tab-bar-scroll">
      <button
        v-for="tab in tabsStore.tabs"
        :key="tab.noteId"
        type="button"
        role="tab"
        :class="['editor-tab', { active: tab.noteId === tabsStore.activeTabId, dirty: tabsStore.isTabDirtyForTab(tab) }]"
        :aria-selected="tab.noteId === tabsStore.activeTabId"
        @click="onActivate(tab.noteId)"
        @auxclick="onAuxClick($event, tab.noteId)"
        @contextmenu.prevent="onContextMenu($event, tab.noteId)"
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

  <Teleport to="body">
    <div
      v-if="tabContextMenu"
      data-testid="tab-context-menu"
      class="context-menu context-menu-fixed"
      :style="{ top: tabContextMenu.y + 'px', left: tabContextMenu.x + 'px' }"
      @click.stop
    >
      <button type="button" @click="requestClose('current', tabContextMenu.noteId)">关闭当前标签页</button>
      <button
        type="button"
        :disabled="tabsStore.tabs.length < 2"
        @click="requestClose('others', tabContextMenu.noteId)"
      >
        关闭其他标签页
      </button>
      <button type="button" @click="requestClose('all', tabContextMenu.noteId)">关闭所有标签页</button>
    </div>
  </Teleport>

  <div
    v-if="pendingClose"
    data-testid="tab-close-confirm"
    class="modal-overlay"
    @click.self="cancelPendingClose"
  >
    <div class="modal">
      <div class="modal-title">关闭标签页</div>
      <p class="modal-body-text">
        将关闭 {{ pendingClose.targetIds.length }} 个标签页，其中 {{ pendingClose.dirtyCount }} 个有未保存内容。
      </p>
      <div class="modal-actions">
        <button class="btn-primary" @click="confirmPendingClose(true)">保存并关闭</button>
        <button class="danger-text-btn" @click="confirmPendingClose(false)">直接关闭</button>
        <button @click="cancelPendingClose">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useEditorTabsStore } from '../stores/editorTabs'
import { useNoteStore } from '../stores/note'
import AppIcon from './AppIcon.vue'

type TabCloseScope = 'current' | 'others' | 'all'

interface TabContextMenuState {
  noteId: string
  x: number
  y: number
}

interface PendingCloseState {
  scope: TabCloseScope
  anchorNoteId: string
  targetIds: string[]
  dirtyCount: number
}

const tabsStore = useEditorTabsStore()
const noteStore = useNoteStore()
const tabContextMenu = ref<TabContextMenuState | null>(null)
const pendingClose = ref<PendingCloseState | null>(null)

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

function onContextMenu(e: MouseEvent, noteId: string) {
  pendingClose.value = null
  tabContextMenu.value = { noteId, x: e.clientX, y: e.clientY }
}

function requestClose(scope: TabCloseScope, noteId: string) {
  const targetIds = tabsStore.getCloseTargetIds(scope, noteId)
  tabContextMenu.value = null
  if (targetIds.length === 0) return

  const dirtyIds = tabsStore.getDirtyTabIds(targetIds)
  if (dirtyIds.length === 0) {
    applyClose(scope, noteId, false)
    return
  }

  pendingClose.value = {
    scope,
    anchorNoteId: noteId,
    targetIds,
    dirtyCount: dirtyIds.length,
  }
}

function applyClose(scope: TabCloseScope, noteId: string, save: boolean) {
  if (scope === 'current') {
    tabsStore.closeCurrentTab(noteId, { save })
    return
  }
  if (scope === 'others') {
    tabsStore.closeOtherTabs(noteId, { save })
    return
  }
  tabsStore.closeAllTabs({ save })
}

function confirmPendingClose(save: boolean) {
  if (!pendingClose.value) return
  const { scope, anchorNoteId } = pendingClose.value
  pendingClose.value = null
  applyClose(scope, anchorNoteId, save)
}

function cancelPendingClose() {
  pendingClose.value = null
}

function onGlobalClick() {
  tabContextMenu.value = null
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    tabContextMenu.value = null
    pendingClose.value = null
  }
}

function onCreate() {
  const note = noteStore.createNote(noteStore.activeFolderId ?? undefined)
  tabsStore.openTabForNewNote(note.id)
}

onMounted(() => {
  document.addEventListener('click', onGlobalClick)
  window.addEventListener('keydown', onGlobalKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onGlobalClick)
  window.removeEventListener('keydown', onGlobalKeydown)
})
</script>

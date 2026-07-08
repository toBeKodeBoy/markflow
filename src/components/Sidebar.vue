<template>
  <aside class="sidebar" :style="{ width: sidebarWidth + 'px' }">
    <SearchBar
      ref="searchBarRef"
      :show-count="isSearchMode"
      :result-count="searchResultNotes.length"
    />

    <div v-if="store.allTags.length" class="sidebar-tags">
      <button
        class="sidebar-tag"
        :class="{ active: !store.activeTagFilter }"
        @click="store.setActiveTagFilter(null)"
      >全部</button>
      <button
        v-for="tag in store.allTags"
        :key="tag"
        class="sidebar-tag"
        :class="{ active: isTagFilterActive(tag) }"
        @click="onTagClick(tag)"
      >{{ tag }}</button>
    </div>

    <div v-if="!isSearchMode" class="sidebar-section">
      <div class="section-header" @click="clearActiveFolder">
        <span class="section-icon"><AppIcon name="file" :size="14" /></span>
        <span class="section-title">全部笔记</span>
        <span class="count">{{ store.noteList.length }}</span>
      </div>
    </div>

    <div v-if="!isSearchMode" class="sidebar-section folders-section">
      <div class="section-header folders-header">
        <span class="section-icon"><AppIcon name="folder" :size="14" /></span>
        <span class="section-title">文件夹</span>
        <button
          class="btn-icon"
          @click.stop="openNewFolderInput()"
          title="新建文件夹"
          aria-label="新建文件夹"
        >
          <AppIcon name="plus" :size="14" />
        </button>
      </div>

      <p v-if="store.activeFolderId" class="folder-context-hint">
        在此新建：
        <span class="folder-context-name">{{ activeFolderLabel }}</span>
      </p>

      <div v-if="showNewFolder" class="new-folder-input">
        <input
          ref="folderInputRef"
          v-model="newFolderName"
          type="text"
          :placeholder="newFolderParentId ? '子文件夹名称' : '文件夹名称'"
          @keyup.enter="createFolder"
          @keyup.escape="cancelNewFolder"
          @blur="createFolder"
        />
      </div>

      <div
        ref="treeRef"
        class="sidebar-tree"
        :class="{ 'is-drag-over-root': dragOverRoot }"
        @scroll="onTreeScroll"
        @dragover.prevent="onRootDragOver"
        @dragleave="onRootDragLeave"
        @drop.prevent="onRootDrop"
      >
        <div
          v-if="useVirtualTree"
          class="sidebar-tree-virtual"
          :style="{ height: virtualListHeight + 'px' }"
        >
          <template v-for="(row, i) in visibleSidebarRows" :key="rowKey(row, String(virtualStart + i))">
            <SidebarTreeRowView
              :row="row"
              :expanded="expandedFolderIds.has(row.folder?.id ?? '')"
              :active-folder-id="store.activeFolderId"
              :current-note-id="store.currentNote?.id"
              :renaming-folder-id="renamingFolderId"
              v-model:renaming-folder-name="renamingFolderName"
              :drag-over-folder-id="dragOverFolderId"
              :drag-over-note-id="dragOverNoteId"
              :drag-over-note-position="dragOverNotePosition"
              virtual
              :virtual-style="{ top: (virtualStart + i) * SIDEBAR_ROW_HEIGHT + 'px' }"
              @folder-click="onFolderClick"
              @toggle-expand="toggleExpand"
              @folder-context="openFolderContextMenu"
              @commit-rename-folder="commitRenameFolder"
              @cancel-rename-folder="renamingFolderId = null"
              @start-rename-folder="startRenameFolder"
              @note-click="openNoteTab"
              @tag-click="onTagClick"
              @note-context="openNoteContextMenu"
              @drag-start="onDragStart"
              @drag-over-folder="onFolderDragOver"
              @drag-leave-folder="dragOverFolderId = null"
              @drop-on-folder="onDropOnFolder"
              @drag-over-note="onNoteDragOver"
              @drag-leave-note="onNoteDragLeave"
              @drop-on-note="onDropOnNote"
            />
          </template>
        </div>

        <template v-else>
          <SidebarTreeRowView
            v-for="row in sidebarRows"
            :key="rowKey(row)"
            :row="row"
            :expanded="expandedFolderIds.has(row.folder?.id ?? '')"
            :active-folder-id="store.activeFolderId"
            :current-note-id="store.currentNote?.id"
            :renaming-folder-id="renamingFolderId"
            v-model:renaming-folder-name="renamingFolderName"
            :drag-over-folder-id="dragOverFolderId"
            :drag-over-note-id="dragOverNoteId"
            :drag-over-note-position="dragOverNotePosition"
            @folder-click="onFolderClick"
            @toggle-expand="toggleExpand"
            @folder-context="openFolderContextMenu"
            @commit-rename-folder="commitRenameFolder"
            @cancel-rename-folder="renamingFolderId = null"
            @start-rename-folder="startRenameFolder"
            @note-click="openNoteTab"
            @tag-click="onTagClick"
            @note-context="openNoteContextMenu"
            @drag-start="onDragStart"
            @drag-over-folder="onFolderDragOver"
            @drag-leave-folder="dragOverFolderId = null"
            @drop-on-folder="onDropOnFolder"
            @drag-over-note="onNoteDragOver"
            @drag-leave-note="onNoteDragLeave"
            @drop-on-note="onDropOnNote"
          />
        </template>

        <div v-if="showTreeEmpty" class="empty-tip">
          {{ emptyTip }}
        </div>
      </div>
    </div>

    <div v-else class="sidebar-section search-results-section">
      <SearchResultsList
        :notes="searchResultNotes"
        :query="store.searchQuery"
        :folders="store.folderList"
        :current-note-id="store.currentNote?.id"
        :folder-scope-label="searchFolderScopeLabel"
        :get-content="store.getNoteContentById"
        @select="openNoteTab"
        @clear="onClearSearch"
      />
    </div>

    <TagCloudPanel
      v-if="store.tagStats.length"
      :tags="store.tagStats"
      :active-tag="store.activeTagFilter"
      :collapsed="tagCloudCollapsed"
      @select="onTagClick"
      @toggle-collapse="toggleTagCloudCollapsed"
    />

    <div class="sidebar-resizer" title="拖拽调整宽度" @mousedown="startResize" />

    <Teleport to="body">
      <div
        v-if="noteContextMenu"
        class="context-menu context-menu-fixed"
        :style="{ top: noteContextMenu.y + 'px', left: noteContextMenu.x + 'px' }"
        @click.stop
      >
        <button @click="startRenameNote(noteContextMenu.noteId)">重命名</button>
        <button @click="startMoveNote(noteContextMenu.noteId)">移动到</button>
        <button @click="togglePin(noteContextMenu.noteId)">
          {{ isNotePinned(noteContextMenu.noteId) ? '取消置顶' : '置顶' }}
        </button>
        <button class="danger" @click="deleteNote(noteContextMenu.noteId)">删除</button>
      </div>

      <div
        v-if="folderContextMenu"
        class="context-menu context-menu-fixed"
        :style="{ top: folderContextMenu.y + 'px', left: folderContextMenu.x + 'px' }"
        @click.stop
      >
        <button @click="openNewFolderInput(folderContextMenu.folderId)">新建子文件夹</button>
        <button @click="createNoteInFolder(folderContextMenu.folderId)">新建笔记</button>
        <button @click="startRenameFolderById(folderContextMenu.folderId)">重命名</button>
        <button @click="startMoveFolder(folderContextMenu.folderId)">移动到…</button>
        <button class="danger" @click="promptDeleteFolder(folderContextMenu.folderId)">删除</button>
      </div>
    </Teleport>

    <div v-if="renamingNoteId" class="modal-overlay" @click.self="renamingNoteId = null">
      <div class="modal">
        <div class="modal-title">重命名笔记</div>
        <input v-model="renamingNoteName" class="modal-input" @keyup.enter="commitRenameNote" />
        <div class="modal-actions">
          <button class="btn-primary" @click="commitRenameNote">确认</button>
          <button @click="renamingNoteId = null">取消</button>
        </div>
      </div>
    </div>

    <div v-if="movingNoteId" class="modal-overlay" @click.self="closeMoveNoteModal">
      <div class="modal">
        <div class="modal-title">移动到</div>
        <div class="move-folder-list">
          <button
            class="move-folder-item"
            :class="{ current: movingNoteFolderId === undefined }"
            :disabled="movingNoteFolderId === undefined"
            @click="commitMoveNote(undefined)"
          >
            无文件夹（根目录）
            <span v-if="movingNoteFolderId === undefined" class="move-folder-tag">当前</span>
          </button>
          <button
            v-for="row in moveFolderRows"
            :key="row.folder.id"
            class="move-folder-item"
            :class="{ current: movingNoteFolderId === row.folder.id, disabled: isMoveFolderDisabled(row.folder.id) }"
            :disabled="movingNoteFolderId === row.folder.id || isMoveFolderDisabled(row.folder.id)"
            :style="{ paddingLeft: (16 + row.depth * 16) + 'px' }"
            @click="commitMoveNote(row.folder.id)"
          >
            {{ row.folder.name }}
            <span v-if="movingNoteFolderId === row.folder.id" class="move-folder-tag">当前</span>
          </button>
        </div>
        <div class="modal-actions">
          <button @click="closeMoveNoteModal">取消</button>
        </div>
      </div>
    </div>

    <div v-if="movingFolderId" class="modal-overlay" @click.self="closeMoveFolderModal">
      <div class="modal">
        <div class="modal-title">移动文件夹到</div>
        <div class="move-folder-list">
          <button
            class="move-folder-item"
            :class="{ current: movingFolderParentId === undefined, disabled: isMoveFolderTargetDisabled(undefined) }"
            :disabled="isMoveFolderTargetDisabled(undefined)"
            @click="commitMoveFolder(undefined)"
          >
            根目录
          </button>
          <button
            v-for="row in moveFolderRows"
            :key="'mf-' + row.folder.id"
            class="move-folder-item"
            :class="{ current: movingFolderParentId === row.folder.id, disabled: isMoveFolderTargetDisabled(row.folder.id) }"
            :disabled="isMoveFolderTargetDisabled(row.folder.id)"
            :style="{ paddingLeft: (16 + row.depth * 16) + 'px' }"
            @click="commitMoveFolder(row.folder.id)"
          >
            {{ row.folder.name }}
          </button>
        </div>
        <div class="modal-actions">
          <button @click="closeMoveFolderModal">取消</button>
        </div>
      </div>
    </div>

    <div v-if="deleteFolderTarget" class="modal-overlay" @click.self="deleteFolderTarget = null">
      <div class="modal">
        <div class="modal-title">删除文件夹</div>
        <p class="modal-body-text">
          将删除 <strong>{{ deleteFolderTarget.impact.folderCount }}</strong> 个文件夹，
          <strong>{{ deleteFolderTarget.impact.noteCount }}</strong> 篇笔记将移至
          {{ deleteMoveTargetLabel }}。
        </p>
        <div class="modal-actions">
          <button class="btn-primary danger" @click="confirmDeleteFolder">删除</button>
          <button @click="deleteFolderTarget = null">取消</button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useNoteStore } from '../stores/note'
import { useEditorTabsStore } from '../stores/editorTabs'
import { showAppNotification } from '../utils/notify'
import {
  flattenFolderTree,
  collectAncestorFolderIds,
  getFolderPathLabel,
  wouldCreateFolderCycle,
  type FolderDeleteImpact,
} from '../utils/folderTree'
import {
  flattenSidebarTree,
  collectAncestorIdsForNote,
  collectExpandIdsForSearch,
  type SidebarTreeRow,
} from '../utils/sidebarTree'
import { buildTreeIndex } from '../utils/treeIndex'
import AppIcon from './AppIcon.vue'
import SidebarTreeRowView from './SidebarTreeRow.vue'
import SearchBar from './SearchBar.vue'
import SearchResultsList from './SearchResultsList.vue'
import TagCloudPanel from './TagCloudPanel.vue'
import { useAppSettings, clampSidebarWidth } from '../composables/useAppSettings'
import { useNoteSort } from '../composables/useNoteSort'
import { sortNotes } from '../utils/noteSort'

const SIDEBAR_ROW_HEIGHT = 42
const VIRTUAL_THRESHOLD = 150
const VIRTUAL_BUFFER = 8

const store = useNoteStore()
const tabsStore = useEditorTabsStore()

function openNoteTab(noteId: string) {
  tabsStore.openTab(noteId)
}
const appSettings = useAppSettings()

const sidebarWidth = ref(clampSidebarWidth(appSettings.get().sidebarWidth ?? 240))
const showNewFolder = ref(false)
const newFolderName = ref('')
const newFolderParentId = ref<string | undefined>(undefined)
const folderInputRef = ref<HTMLInputElement>()
const treeRef = ref<HTMLElement>()
const searchBarRef = ref<InstanceType<typeof SearchBar>>()
const scrollTop = ref(0)

const renamingFolderId = ref<string | null>(null)
const renamingFolderName = ref('')
const noteContextMenu = ref<{ noteId: string; x: number; y: number } | null>(null)
const folderContextMenu = ref<{ folderId: string; x: number; y: number } | null>(null)
const renamingNoteId = ref<string | null>(null)
const renamingNoteName = ref('')
const movingNoteId = ref<string | null>(null)
const movingNoteFolderId = ref<string | undefined>(undefined)
const movingFolderId = ref<string | null>(null)
const movingFolderParentId = ref<string | undefined>(undefined)
const deleteFolderTarget = ref<{ id: string; impact: FolderDeleteImpact } | null>(null)
const expandedFolderIds = ref(new Set<string>())

const TAG_CLOUD_AUTO_COLLAPSE_THRESHOLD = 3

function resolveTagCloudCollapsed(tagCount: number): boolean {
  const saved = appSettings.get().sidebarTagCloudCollapsed
  if (saved !== undefined) return saved
  return tagCount <= TAG_CLOUD_AUTO_COLLAPSE_THRESHOLD
}

const tagCloudCollapsed = ref(resolveTagCloudCollapsed(store.tagStats.length))

const dragPayload = ref<{ kind: 'note' | 'folder'; id: string } | null>(null)
const dragOverFolderId = ref<string | null>(null)
const dragOverNoteId = ref<string | null>(null)
const dragOverNotePosition = ref<'before' | 'after' | null>(null)
const dragOverRoot = ref(false)

const noteSort = useNoteSort({
  getSiblings: (noteId) => {
    const note = store.noteList.find((n) => n.id === noteId)
    const folderId = note?.folderId
    return sortNotes(store.noteList.filter((n) => n.folderId === folderId))
  },
  onReorder: (folderId, orderedIds) => store.reorderNotes(folderId, orderedIds),
})

const treeIndex = computed(() => buildTreeIndex(store.folderList, store.searchedNoteList))
const isSearchMode = computed(() => store.searchQuery.trim().length > 0)
const isSearching = computed(() => isSearchMode.value || !!store.activeTagFilter)

const searchResultNotes = computed(() => store.filteredNoteList)

const searchFolderScopeLabel = computed(() => {
  if (!store.activeFolderId) return ''
  const label = getFolderPathLabel(store.folderList, store.activeFolderId)
  return label ? `文件夹：${label}` : ''
})

const sidebarRows = computed(() =>
  flattenSidebarTree(store.folderList, store.searchedNoteList, expandedFolderIds.value, {
    hideEmptyFolders: isSearching.value,
    index: treeIndex.value,
  })
)

const useVirtualTree = computed(() => sidebarRows.value.length > VIRTUAL_THRESHOLD)
const virtualListHeight = computed(() => sidebarRows.value.length * SIDEBAR_ROW_HEIGHT)
const virtualStart = computed(() => {
  if (!useVirtualTree.value) return 0
  return Math.max(0, Math.floor(scrollTop.value / SIDEBAR_ROW_HEIGHT) - VIRTUAL_BUFFER)
})
const virtualEnd = computed(() => {
  if (!useVirtualTree.value) return sidebarRows.value.length
  const containerH = treeRef.value?.clientHeight ?? 400
  const count = Math.ceil(containerH / SIDEBAR_ROW_HEIGHT) + VIRTUAL_BUFFER * 2
  return Math.min(sidebarRows.value.length, virtualStart.value + count)
})
const visibleSidebarRows = computed(() =>
  sidebarRows.value.slice(virtualStart.value, virtualEnd.value)
)

const showTreeEmpty = computed(() => {
  if (isSearching.value) return store.searchedNoteList.length === 0
  return store.noteList.length === 0 && store.folderList.length === 0
})

const emptyTip = computed(() => {
  if (store.activeTagFilter) return '无匹配标签的笔记'
  if (store.searchQuery.trim()) return '无匹配笔记'
  return '暂无笔记，点击顶栏「新建」'
})

const activeFolderLabel = computed(() => {
  if (!store.activeFolderId) return ''
  return getFolderPathLabel(store.folderList, store.activeFolderId) || '未知文件夹'
})

const deleteMoveTargetLabel = computed(() => {
  const to = deleteFolderTarget.value?.impact.moveNotesTo
  if (to === undefined) return '根目录'
  return getFolderPathLabel(store.folderList, to) || '父文件夹'
})

const moveFolderRows = computed(() =>
  flattenFolderTree(store.folderList, new Set(store.folderList.map((f) => f.id)))
)

function rowKey(row: SidebarTreeRow, suffix = '') {
  const base = row.kind === 'folder' ? `f-${row.folder!.id}` : `n-${row.note!.id}`
  return suffix ? `${base}-${suffix}` : base
}

function persistSidebarState() {
  appSettings.save({
    sidebarExpandedFolderIds: [...expandedFolderIds.value],
    sidebarActiveFolderId: store.activeFolderId,
  })
}

function clearActiveFolder() {
  store.activeFolderId = null
  persistSidebarState()
}

function onClearSearch() {
  searchBarRef.value?.clearSearch()
}

function isTagFilterActive(tag: string): boolean {
  return store.activeTagFilter?.toLowerCase() === tag.toLowerCase()
}

function onTagClick(tag: string) {
  if (isTagFilterActive(tag)) {
    store.setActiveTagFilter(null)
  } else {
    store.setActiveTagFilter(tag)
  }
}

function toggleTagCloudCollapsed() {
  tagCloudCollapsed.value = !tagCloudCollapsed.value
  appSettings.save({ sidebarTagCloudCollapsed: tagCloudCollapsed.value })
}

function onTreeScroll(e: Event) {
  scrollTop.value = (e.target as HTMLElement).scrollTop
}

function openNewFolderInput(parentId?: string) {
  folderContextMenu.value = null
  newFolderParentId.value = parentId ?? store.activeFolderId ?? undefined
  showNewFolder.value = true
}

function cancelNewFolder() {
  showNewFolder.value = false
  newFolderName.value = ''
  newFolderParentId.value = undefined
}

function createFolder() {
  if (newFolderName.value.trim()) {
    const folder = store.createFolder(newFolderName.value.trim(), newFolderParentId.value)
    store.activeFolderId = folder.id
    const next = new Set(expandedFolderIds.value)
    if (folder.parentId) {
      for (const id of collectAncestorFolderIds(folder.id, store.folderList)) next.add(id)
    }
    next.add(folder.id)
    expandedFolderIds.value = next
    persistSidebarState()
  }
  cancelNewFolder()
}

function createNoteInFolder(folderId: string) {
  folderContextMenu.value = null
  store.activeFolderId = folderId
  const note = store.createNote(folderId)
  tabsStore.openTabForNewNote(note.id)
  persistSidebarState()
}

function onFolderClick(folderId: string, hasChildren: boolean) {
  if (hasChildren) toggleExpand(folderId)
  store.activeFolderId = folderId
  persistSidebarState()
}

function toggleExpand(folderId: string) {
  const next = new Set(expandedFolderIds.value)
  if (next.has(folderId)) next.delete(folderId)
  else next.add(folderId)
  expandedFolderIds.value = next
  persistSidebarState()
}

function startRenameFolder(folder: { id: string; name: string }) {
  renamingFolderId.value = folder.id
  renamingFolderName.value = folder.name
}

function startRenameFolderById(id: string) {
  folderContextMenu.value = null
  const folder = store.folderList.find((f) => f.id === id)
  if (folder) startRenameFolder(folder)
}

function commitRenameFolder() {
  if (renamingFolderId.value && renamingFolderName.value.trim()) {
    store.renameFolder(renamingFolderId.value, renamingFolderName.value.trim())
  }
  renamingFolderId.value = null
}

function openFolderContextMenu(e: MouseEvent, folderId: string) {
  noteContextMenu.value = null
  folderContextMenu.value = { folderId, x: e.clientX, y: e.clientY }
}

function promptDeleteFolder(folderId: string) {
  folderContextMenu.value = null
  deleteFolderTarget.value = {
    id: folderId,
    impact: store.getDeleteFolderImpact(folderId),
  }
}

function confirmDeleteFolder() {
  if (!deleteFolderTarget.value) return
  store.deleteFolder(deleteFolderTarget.value.id)
  deleteFolderTarget.value = null
  persistSidebarState()
}

function startMoveFolder(folderId: string) {
  folderContextMenu.value = null
  const folder = store.folderList.find((f) => f.id === folderId)
  if (!folder) return
  movingFolderId.value = folderId
  movingFolderParentId.value = folder.parentId
}

function isMoveFolderTargetDisabled(targetId: string | undefined) {
  if (!movingFolderId.value) return false
  if (targetId === movingFolderId.value) return true
  return wouldCreateFolderCycle(store.folderList, movingFolderId.value, targetId)
}

function isMoveFolderDisabled(folderId: string) {
  return movingNoteId.value === folderId
}

function commitMoveFolder(parentId: string | undefined) {
  if (!movingFolderId.value) return
  if (isMoveFolderTargetDisabled(parentId)) return
  const ok = store.moveFolder(movingFolderId.value, parentId)
  if (ok) {
    showAppNotification(`文件夹已移动到：${folderLabel(parentId)}`)
    closeMoveFolderModal()
  } else {
    showAppNotification('无法移动到该位置')
  }
}

function closeMoveFolderModal() {
  movingFolderId.value = null
  movingFolderParentId.value = undefined
}

function openNoteContextMenu(e: MouseEvent, noteId: string) {
  folderContextMenu.value = null
  noteContextMenu.value = { noteId, x: e.clientX, y: e.clientY }
}

function isNotePinned(noteId: string) {
  return store.noteList.find((n) => n.id === noteId)?.pinned === true
}

function togglePin(noteId: string) {
  store.toggleNotePinned(noteId)
  noteContextMenu.value = null
}

function startRenameNote(id: string) {
  const note = store.noteList.find((n) => n.id === id)
  if (note) {
    renamingNoteId.value = id
    renamingNoteName.value = note.title
  }
  noteContextMenu.value = null
}

function commitRenameNote() {
  if (renamingNoteId.value && renamingNoteName.value.trim()) {
    store.renameNote(renamingNoteId.value, renamingNoteName.value.trim())
  }
  renamingNoteId.value = null
}

function startMoveNote(id: string) {
  const note = store.noteList.find((n) => n.id === id)
  if (!note) return
  movingNoteId.value = id
  movingNoteFolderId.value = note.folderId
  noteContextMenu.value = null
}

function folderLabel(folderId: string | undefined) {
  if (folderId === undefined) return '根目录'
  return getFolderPathLabel(store.folderList, folderId) || '未知文件夹'
}

function commitMoveNote(folderId: string | undefined) {
  if (!movingNoteId.value) return
  if (movingNoteFolderId.value === folderId) return
  store.moveNote(movingNoteId.value, folderId)
  showAppNotification(`已移动到：${folderLabel(folderId)}`)
  closeMoveNoteModal()
}

function closeMoveNoteModal() {
  movingNoteId.value = null
  movingNoteFolderId.value = undefined
}

function deleteNote(id: string) {
  noteContextMenu.value = null
  store.deleteNote(id)
}

function onDragStart(payload: { kind: 'note' | 'folder'; id: string }) {
  dragPayload.value = payload
}

function onNoteDragOver(noteId: string, position: 'before' | 'after') {
  if (dragPayload.value?.kind !== 'note') return
  if (dragPayload.value.id === noteId) return
  dragOverNoteId.value = noteId
  dragOverNotePosition.value = position
}

function onNoteDragLeave() {
  dragOverNoteId.value = null
  dragOverNotePosition.value = null
}

function onDropOnNote(targetId: string, position: 'before' | 'after') {
  dragOverNoteId.value = null
  dragOverNotePosition.value = null
  const payload = dragPayload.value
  dragPayload.value = null
  if (!payload || payload.kind !== 'note' || payload.id === targetId) return

  const dragged = store.noteList.find((n) => n.id === payload.id)
  const target = store.noteList.find((n) => n.id === targetId)
  if (!dragged || !target || dragged.folderId !== target.folderId) return

  noteSort.handleNoteDrop(payload.id, targetId, position, dragged.folderId)
}

function onFolderDragOver(folderId: string) {
  if (!dragPayload.value) return
  if (dragPayload.value.kind === 'folder' && dragPayload.value.id === folderId) return
  if (
    dragPayload.value.kind === 'folder' &&
    wouldCreateFolderCycle(store.folderList, dragPayload.value.id, folderId)
  ) {
    return
  }
  dragOverFolderId.value = folderId
}

function onDropOnFolder(folderId: string) {
  dragOverFolderId.value = null
  const payload = dragPayload.value
  dragPayload.value = null
  if (!payload) return
  if (payload.kind === 'note') {
    store.moveNote(payload.id, folderId)
    showAppNotification(`已移动到：${folderLabel(folderId)}`)
  } else if (payload.id !== folderId) {
    const ok = store.moveFolder(payload.id, folderId)
    if (ok) showAppNotification(`文件夹已移动到：${folderLabel(folderId)}`)
  }
  const next = new Set(expandedFolderIds.value)
  next.add(folderId)
  expandedFolderIds.value = next
  persistSidebarState()
}

function onRootDragOver() {
  if (!dragPayload.value) return
  dragOverRoot.value = true
}

function onRootDragLeave() {
  dragOverRoot.value = false
}

function onRootDrop() {
  dragOverRoot.value = false
  const payload = dragPayload.value
  dragPayload.value = null
  if (!payload) return
  if (payload.kind === 'note') {
    store.moveNote(payload.id, undefined)
    showAppNotification('已移动到：根目录')
  } else {
    const ok = store.moveFolder(payload.id, undefined)
    if (ok) showAppNotification('文件夹已移动到：根目录')
  }
  persistSidebarState()
}

function startResize(e: MouseEvent) {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = sidebarWidth.value

  function onMove(ev: MouseEvent) {
    sidebarWidth.value = clampSidebarWidth(startWidth + ev.clientX - startX)
  }

  function onUp() {
    appSettings.save({ sidebarWidth: sidebarWidth.value })
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function onGlobalClick() {
  noteContextMenu.value = null
  folderContextMenu.value = null
}

watch(showNewFolder, async (val) => {
  if (val) {
    await nextTick()
    folderInputRef.value?.focus()
  }
})

watch(
  () => store.activeFolderId,
  (folderId) => {
    if (!folderId) return
    const next = new Set(expandedFolderIds.value)
    for (const id of collectAncestorFolderIds(folderId, store.folderList)) next.add(id)
    expandedFolderIds.value = next
  }
)

watch(
  () => store.currentNote?.id,
  (noteId) => {
    if (!noteId) return
    const note = store.noteList.find((n) => n.id === noteId)
    if (!note) return
    const next = new Set(expandedFolderIds.value)
    for (const id of collectAncestorIdsForNote(note, store.folderList)) next.add(id)
    expandedFolderIds.value = next
  }
)

watch(
  () => [store.searchQuery, store.activeTagFilter] as const,
  ([q, tag]) => {
    if (!q.trim() && !tag) return
    const ids = collectExpandIdsForSearch(store.folderList, store.searchedNoteList)
    expandedFolderIds.value = new Set([...expandedFolderIds.value, ...ids])
    persistSidebarState()
  }
)

watch(
  () => store.sidebarStateRevision,
  () => {
    const settings = appSettings.get()
    expandedFolderIds.value = new Set(settings.sidebarExpandedFolderIds ?? [])
    if (settings.sidebarActiveFolderId !== undefined) {
      store.activeFolderId = settings.sidebarActiveFolderId
    }
  }
)

onMounted(() => {
  document.addEventListener('click', onGlobalClick)
  const settings = appSettings.get()
  if (settings.sidebarExpandedFolderIds?.length) {
    expandedFolderIds.value = new Set(settings.sidebarExpandedFolderIds)
  }
  if (settings.sidebarActiveFolderId) {
    store.activeFolderId = settings.sidebarActiveFolderId
  }
})

onUnmounted(() => document.removeEventListener('click', onGlobalClick))
</script>

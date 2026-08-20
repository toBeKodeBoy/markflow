<template>
  <aside class="sidebar" :style="{ width: sidebarWidth + 'px' }">
    <SidebarBrand
      @create-note="openCreateModal('note', activeSpaceId ?? undefined)"
      @navigate-home="workspace.showHome()"
    />
    <SidebarNav :active="activeNav" :trash-count="trashCount" @select="onNavSelect" />

    <div v-if="selectedNoteIds.size > 0" class="sidebar-batch-bar">
      <span class="batch-count">已选 {{ selectedNoteIds.size }} 篇</span>
      <button class="batch-btn" @click="startBatchMove">移动到</button>
      <button class="batch-btn" @click="clearSelection">取消选择</button>
    </div>

    <div class="sidebar-section folders-section">
      <div
        ref="treeRef"
        class="sidebar-tree"
        :class="{ 'is-drag-over-root': dragOverRoot }"
        @dragover.prevent="onRootDragOver"
        @dragleave="onRootDragLeave"
        @drop.prevent="onRootDrop"
      >
        <SidebarSpaces
          :spaces="spaceFolders"
          :active-space-id="activeSpaceId"
          :expanded-space-ids="expandedSpaceIds"
          :my-expanded="expandedFolderIds.has(MY_FOLDER_ID)"
          @select="selectSpace"
          @toggle="toggleSpace"
          @folder-context="openFolderContextMenu"
          @create-space="openCreateModal('folder', undefined, true)"
        >
          <template #body="{ space }">
            <div class="sidebar-space-body">
              <template v-if="space">
                <SidebarTreeRowView
                  v-for="row in (spaceRowsMap.get(space.id) ?? [])"
                  :key="rowKey(row, space.id)"
                  :row="row"
                  :expanded="expandedFolderIds.has(row.folder?.id ?? '')"
                  :active-folder-id="store.activeFolderId"
                  :current-note-id="store.currentNote?.id"
                  :renaming-folder-id="renamingFolderId"
                  v-model:renaming-folder-name="renamingFolderName"
                  :renaming-note-id="renamingNoteId"
                  v-model:renaming-note-name="renamingNoteName"
                  :drag-over-folder-id="dragOverFolderId"
                  :drag-over-note-id="dragOverNoteId"
                  :drag-over-note-position="dragOverNotePosition"
                  :drag-over-folder-position="dragOverFolderPosition"
                  :highlighted-note-id="highlightedNoteId"
                  :selected-note-ids="selectedNoteIds"
                  @folder-click="onFolderClick"
                  @toggle-expand="toggleExpand"
                  @folder-context="openFolderContextMenu"
                  @commit-rename-folder="commitRenameFolder"
                  @cancel-rename-folder="renamingFolderId = null"
                  @start-rename-folder="startRenameFolder"
                  @note-click="openNoteTab"
                  @note-ctrl-click="onNoteCtrlClick"
                  @start-rename-note="startRenameNote"
                  @commit-rename-note="commitRenameNote"
                  @cancel-rename-note="cancelRenameNote"
                  @note-context="openNoteContextMenu"
                  @drag-start="onDragStart"
                  @drag-over-folder="onFolderDragOver"
                  @drag-leave-folder="onFolderDragLeave"
                  @drop-on-folder="onDropOnFolder"
                  @drag-over-note="onNoteDragOver"
                  @drag-leave-note="onNoteDragLeave"
                  @drop-on-note="onDropOnNote"
                />
              </template>
              <template v-else>
                <SidebarTreeRowView
                  v-for="row in mySpaceRows"
                  :key="rowKey(row, 'my')"
                  :row="row"
                  :expanded="expandedFolderIds.has(row.folder?.id ?? '')"
                  :active-folder-id="store.activeFolderId"
                  :current-note-id="store.currentNote?.id"
                  :renaming-folder-id="renamingFolderId"
                  v-model:renaming-folder-name="renamingFolderName"
                  :renaming-note-id="renamingNoteId"
                  v-model:renaming-note-name="renamingNoteName"
                  :drag-over-folder-id="dragOverFolderId"
                  :drag-over-note-id="dragOverNoteId"
                  :drag-over-note-position="dragOverNotePosition"
                  :drag-over-folder-position="dragOverFolderPosition"
                  :highlighted-note-id="highlightedNoteId"
                  :selected-note-ids="selectedNoteIds"
                  @folder-click="onFolderClick"
                  @toggle-expand="toggleExpand"
                  @folder-context="openFolderContextMenu"
                  @commit-rename-folder="commitRenameFolder"
                  @cancel-rename-folder="renamingFolderId = null"
                  @start-rename-folder="startRenameFolder"
                  @note-click="openNoteTab"
                  @note-ctrl-click="onNoteCtrlClick"
                  @start-rename-note="startRenameNote"
                  @commit-rename-note="commitRenameNote"
                  @cancel-rename-note="cancelRenameNote"
                  @note-context="openNoteContextMenu"
                  @drag-start="onDragStart"
                  @drag-over-folder="onFolderDragOver"
                  @drag-leave-folder="onFolderDragLeave"
                  @drop-on-folder="onDropOnFolder"
                  @drag-over-note="onNoteDragOver"
                  @drag-leave-note="onNoteDragLeave"
                  @drop-on-note="onDropOnNote"
                />
              </template>
            </div>
          </template>
        </SidebarSpaces>

        <div v-if="showTreeEmpty" class="empty-tip">
          {{ emptyTip }}
        </div>
      </div>
    </div>

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
        <button @click="cloneNoteAction(noteContextMenu.noteId)">复制</button>
        <button @click="locateFolder(noteContextMenu.noteId)">定位文件夹</button>
        <button class="danger" @click="deleteNote(noteContextMenu.noteId)">删除</button>
      </div>

      <div
        v-if="folderContextMenu"
        class="context-menu context-menu-fixed"
        :style="{ top: folderContextMenu.y + 'px', left: folderContextMenu.x + 'px' }"
        @click.stop
      >
        <button @click="openCreateModal('folder', folderContextMenu.folderId, true)">新建子文件夹</button>
        <button @click="openCreateModal('note', folderContextMenu.folderId, true)">{{ SIDEBAR_CREATE_NOTE_LABEL }}</button>
        <button @click="startRenameFolderById(folderContextMenu.folderId)">重命名</button>
        <button @click="startMoveFolder(folderContextMenu.folderId)">移动到</button>
        <button @click="toggleFolderPin(folderContextMenu.folderId)">
          {{ isFolderPinned(folderContextMenu.folderId) ? '取消置顶' : '置顶' }}
        </button>
        <button class="danger" @click="promptDeleteFolder(folderContextMenu.folderId)">移入回收站</button>
      </div>
    </Teleport>

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
            {{ mySpaceLabel }}
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

    <!-- 批量移动弹窗 -->
    <div v-if="batchMoveVisible" class="modal-overlay" @click.self="closeBatchMoveModal">
      <div class="modal">
        <div class="modal-title">移动 {{ selectedNoteIds.size }} 篇笔记到</div>
        <div class="move-folder-list">
          <button
            class="move-folder-item"
            @click="commitBatchMove(undefined)"
          >
            {{ mySpaceLabel }}
          </button>
          <button
            v-for="row in moveFolderRows"
            :key="'bm-' + row.folder.id"
            class="move-folder-item"
            :style="{ paddingLeft: (16 + row.depth * 16) + 'px' }"
            @click="commitBatchMove(row.folder.id)"
          >
            {{ row.folder.name }}
          </button>
        </div>
        <div class="modal-actions">
          <button @click="closeBatchMoveModal">取消</button>
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
            {{ mySpaceLabel }}
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
        <div class="modal-title">移入回收站</div>
        <p class="modal-body-text">
          将移入回收站，30 天内可恢复。包含
          <strong>{{ deleteFolderTarget.impact.folderCount }}</strong> 个文件夹、
          <strong>{{ deleteFolderTarget.impact.noteCount }}</strong> 篇笔记。
        </p>
        <div class="modal-actions">
          <button class="btn-primary danger" @click="confirmDeleteFolder">移入回收站</button>
          <button @click="deleteFolderTarget = null">取消</button>
        </div>
      </div>
    </div>

    <CreateEntryModal
      :visible="createModalVisible"
      :default-kind="createModalKind"
      :default-parent-id="createModalDefaultParentId"
      :locked-parent-id="createModalLockedParentId"
      :folders="store.folderList"
      :active-folder-id="store.activeFolderId"
      @cancel="closeCreateModal"
      @created="handleCreateEntry"
    />

    <SidebarFooter @open-settings="emit('openSettings')" @open-help="onOpenHelp" />

  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useNoteStore } from '../stores/note'
import { useEditorTabsStore } from '../stores/editorTabs'
import { useWorkspaceStore } from '../stores/workspace'
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
import CreateEntryModal from './CreateEntryModal.vue'
import SidebarTreeRowView from './SidebarTreeRow.vue'
import SidebarBrand from './sidebar/SidebarBrand.vue'
import SidebarNav from './sidebar/SidebarNav.vue'
import SidebarSpaces from './sidebar/SidebarSpaces.vue'
import SidebarFooter from './sidebar/SidebarFooter.vue'
import type { SidebarNavId } from './sidebar/types'
import { useAppSettings, clampSidebarWidth } from '../composables/useAppSettings'
import { useNoteSort } from '../composables/useNoteSort'
import { sortNotes } from '../utils/noteSort'
import { MY_FOLDER_ID } from '../constants/myFolder'
import {
  SIDEBAR_CREATE_NOTE_LABEL,
  SIDEBAR_EMPTY_SEARCH,
  SIDEBAR_EMPTY_TREE,
  SIDEBAR_MY_SPACE_LABEL,
} from '../constants/sidebarShell'

const mySpaceLabel = SIDEBAR_MY_SPACE_LABEL

const emit = defineEmits<{
  navigateHome: []
  openSettings: []
}>()

const store = useNoteStore()
const tabsStore = useEditorTabsStore()
const workspace = useWorkspaceStore()
const activeNav = computed<SidebarNavId>(() => {
  if (workspace.view === 'home') return 'home'
  if (workspace.view === 'trash') return 'trash'
  return 'docs'
})
const activeSpaceId = ref<string | null>(null)
const spaceFolders = computed(() => store.folderList.filter((folder) => !folder.parentId))
const expandedSpaceIds = ref(new Set<string>())

function resolveTopLevelSpaceId(folderId: string | null | undefined) {
  if (!folderId) return null
  let current = store.folderList.find((folder) => folder.id === folderId)
  while (current?.parentId) {
    const parentId = current.parentId
    current = store.folderList.find((folder) => folder.id === parentId)
  }
  return current?.id ?? null
}

function syncActiveSpaceId(folderId: string | null | undefined) {
  activeSpaceId.value = resolveTopLevelSpaceId(folderId)
}

function toggleSpace(folderId: string | null) {
  const spaceId = folderId ?? MY_FOLDER_ID
  const next = new Set(expandedSpaceIds.value)
  if (next.has(spaceId)) next.delete(spaceId)
  else next.add(spaceId)
  expandedSpaceIds.value = next
  const expandedFolderNext = new Set(expandedFolderIds.value)
  if (next.has(spaceId)) expandedFolderNext.add(spaceId)
  else expandedFolderNext.delete(spaceId)
  expandedFolderIds.value = expandedFolderNext
  persistSidebarState()
}

function syncExpandedSpaceIds() {
  const next = new Set<string>()
  if (expandedFolderIds.value.has(MY_FOLDER_ID)) next.add(MY_FOLDER_ID)
  for (const folder of spaceFolders.value) {
    if (expandedFolderIds.value.has(folder.id)) next.add(folder.id)
  }
  expandedSpaceIds.value = next
}

function openNoteTab(noteId: string) {
  // 普通点击：清空多选并打开笔记
  if (selectedNoteIds.value.size > 0) {
    selectedNoteIds.value = new Set()
  }
  tabsStore.openTab(noteId)
}
const appSettings = useAppSettings()

const sidebarWidth = ref(clampSidebarWidth(appSettings.get().sidebarWidth ?? 260))
const treeRef = ref<HTMLElement>()
const createModalVisible = ref(false)
const createModalKind = ref<'note' | 'folder'>('folder')
const createModalDefaultParentId = ref<string | undefined>(undefined)
const createModalLockedParentId = ref<string | null | undefined>(undefined)

// 修复（R6 遗留）：角标同时统计回收站中的笔记与文件夹数量
// 依赖 trashVersion：存储层数据非响应式，需通过版本号触发重新计算
const trashCount = computed(() => {
  void store.trashVersion
  return store.getTrashNotes().length + store.getTrashFolders().length
})

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

const dragPayload = ref<{ kind: 'note' | 'folder'; id: string } | null>(null)
const dragOverFolderId = ref<string | null>(null)
const dragOverNoteId = ref<string | null>(null)
const dragOverNotePosition = ref<'before' | 'after' | null>(null)
const dragOverRoot = ref(false)

// Task 8: 定位高亮
const highlightedNoteId = ref<string | null>(null)

// Task 10: 文件夹拖拽位置
const dragOverFolderPosition = ref<'before' | 'after' | null>(null)

// Task 11: 多选笔记
const selectedNoteIds = ref(new Set<string>())
const batchMoveVisible = ref(false)

const noteSort = useNoteSort({
  getSiblings: (noteId) => {
    const note = store.noteList.find((n) => n.id === noteId)
    const folderId = note?.folderId
    return sortNotes(store.noteList.filter((n) => n.folderId === folderId))
  },
  onReorder: (folderId, orderedIds) => store.reorderNotes(folderId, orderedIds),
})

const treeIndex = computed(() => buildTreeIndex(store.folderList, store.searchedNoteList))
const isSearching = computed(() => store.searchQuery.trim().length > 0)

function flattenSpaceRows(rootFolderId: string | undefined) {
  return flattenSidebarTree(store.folderList, store.searchedNoteList, expandedFolderIds.value, {
    hideEmptyFolders: isSearching.value,
    index: treeIndex.value,
    pinnedFolderIds: undefined,
    rootFolderId,
  })
}

function flattenSpaceChildrenRows(rootFolderId: string | undefined) {
  const rows = flattenSpaceRows(rootFolderId)
  if (!rootFolderId) {
    return rows.filter((row) => row.kind === 'note' && row.depth === 0)
  }
  return rows.filter((row) => !(row.kind === 'folder' && row.folder?.id === rootFolderId))
}

const mySpaceRows = computed(() => {
  if (!expandedFolderIds.value.has(MY_FOLDER_ID)) return []
  return flattenSpaceChildrenRows(undefined)
})

const spaceRowsMap = computed(() => {
  const map = new Map<string, SidebarTreeRow[]>()
  for (const folder of spaceFolders.value) {
    map.set(folder.id, flattenSpaceChildrenRows(folder.id))
  }
  return map
})

const showTreeEmpty = computed(() => {
  if (isSearching.value) {
    return store.searchedNoteList.length === 0
  }
  return store.noteList.length === 0 && store.folderList.length === 0
})

const emptyTip = computed(() => {
  if (isSearching.value) return SIDEBAR_EMPTY_SEARCH
  return SIDEBAR_EMPTY_TREE
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
    sidebarExpandedSpaceIds: [...expandedSpaceIds.value],
    sidebarActiveFolderId: store.activeFolderId,
    // 用户已对展开状态做出显式选择，同步写入迁移标记，
    // 避免下次启动时一次性迁移覆盖用户折叠容器的意图
    myFolderIntroMigrated: true,
  })
}

function selectSpace(id: string | null) {
  activeSpaceId.value = id
  store.activeFolderId = id
  const nextFolder = new Set(expandedFolderIds.value)
  const nextSpace = new Set(expandedSpaceIds.value)

  if (id) {
    nextFolder.add(id)
    nextSpace.add(id)
  } else {
    nextFolder.add(MY_FOLDER_ID)
    nextSpace.add(MY_FOLDER_ID)
  }

  expandedFolderIds.value = nextFolder
  expandedSpaceIds.value = nextSpace
  if (workspace.view === 'trash') workspace.showDocs(tabsStore.tabs.length > 0)
  persistSidebarState()
}

function onNavSelect(id: SidebarNavId) {
  if (id === 'trash') {
    workspace.showTrash()
    return
  }
  if (id === 'home') {
    workspace.showHome()
    emit('navigateHome')
    return
  }
  workspace.showDocs(tabsStore.tabs.length > 0)
}

function onOpenHelp() {
  tabsStore.openTutorialNote()
}

function openCreateModal(kind: 'note' | 'folder', parentId?: string, locked = false) {
  folderContextMenu.value = null
  createModalKind.value = kind
  createModalDefaultParentId.value = parentId ?? store.activeFolderId ?? undefined
  createModalLockedParentId.value = locked ? parentId ?? null : undefined
  createModalVisible.value = true
}

function closeCreateModal() {
  createModalVisible.value = false
  createModalDefaultParentId.value = undefined
  createModalLockedParentId.value = undefined
}

function handleCreateEntry(payload: { kind: 'note' | 'folder'; id: string; parentId?: string }) {
  closeCreateModal()
  if (payload.kind === 'note') {
    store.activeFolderId = payload.parentId ?? null
    tabsStore.openTabForNewNote(payload.id)
    persistSidebarState()
    return
  }

  store.activeFolderId = payload.id
  const created = store.folderList.find((folder) => folder.id === payload.id)
  if (created && !created.parentId) activeSpaceId.value = created.id
  const next = new Set(expandedFolderIds.value)
  for (const id of collectAncestorFolderIds(payload.id, store.folderList)) next.add(id)
  next.add(payload.id)
  expandedFolderIds.value = next
  if (created && !created.parentId) {
    const nextSpace = new Set(expandedSpaceIds.value)
    nextSpace.add(created.id)
    expandedSpaceIds.value = nextSpace
  }
  persistSidebarState()
}

/** 历史虚拟根目录 ID：侧栏不再渲染该行，但仍兼容旧事件/状态 */
function isVirtualFolder(folderId: string) {
  return folderId === MY_FOLDER_ID
}

function onFolderClick(folderId: string, hasChildren: boolean) {
  if (isVirtualFolder(folderId)) {
    toggleExpand(folderId)
    return
  }
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
  if (isVirtualFolder(folderId)) return
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

// ===== Task 8: 文件夹置顶 =====
function isFolderPinned(folderId: string) {
  return store.folderList.find((f) => f.id === folderId)?.pinned === true
}

function toggleFolderPin(folderId: string) {
  store.toggleFolderPinned(folderId)
  folderContextMenu.value = null
}

// ===== Task 8: 复制笔记 =====
function cloneNoteAction(noteId: string) {
  const cloned = store.cloneNote(noteId)
  noteContextMenu.value = null
  if (cloned) {
    showAppNotification(`已复制笔记：${cloned.title}`)
  }
}

// ===== Task 8: 定位文件夹 =====
function locateFolder(noteId: string) {
  noteContextMenu.value = null
  const ancestorIds = store.locateNoteFolder(noteId)
  if (ancestorIds.length === 0) {
    showAppNotification(`该笔记位于${SIDEBAR_MY_SPACE_LABEL}`)
    return
  }
  const next = new Set(expandedFolderIds.value)
  next.add(MY_FOLDER_ID)
  for (const id of ancestorIds) next.add(id)
  expandedFolderIds.value = next
  persistSidebarState()
  highlightedNoteId.value = noteId
  nextTick(() => {
    const noteEl = treeRef.value?.querySelector(`[data-note-id="${noteId}"]`) as HTMLElement | null
    if (noteEl) {
      noteEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
  setTimeout(() => {
    highlightedNoteId.value = null
  }, 2000)
}

// ===== Task 11: 多选笔记 =====
function onNoteCtrlClick(noteId: string) {
  const next = new Set(selectedNoteIds.value)
  if (next.has(noteId)) {
    next.delete(noteId)
  } else {
    next.add(noteId)
  }
  selectedNoteIds.value = next
}

function clearSelection() {
  selectedNoteIds.value = new Set()
}

// ===== Task 11: 批量移动 =====
function startBatchMove() {
  batchMoveVisible.value = true
}

function commitBatchMove(folderId: string | undefined) {
  if (selectedNoteIds.value.size === 0) return
  store.batchMoveNotes([...selectedNoteIds.value], folderId)
  showAppNotification(`已移动 ${selectedNoteIds.value.size} 篇笔记到：${folderLabel(folderId)}`)
  selectedNoteIds.value = new Set()
  batchMoveVisible.value = false
}

function closeBatchMoveModal() {
  batchMoveVisible.value = false
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
  const title = renamingNoteName.value.trim()
  if (renamingNoteId.value && title) {
    store.renameNote(renamingNoteId.value, title)
  }
  cancelRenameNote()
}

function cancelRenameNote() {
  renamingNoteId.value = null
  renamingNoteName.value = ''
}

function startMoveNote(id: string) {
  const note = store.noteList.find((n) => n.id === id)
  if (!note) return
  movingNoteId.value = id
  movingNoteFolderId.value = note.folderId
  noteContextMenu.value = null
}

function folderLabel(folderId: string | undefined) {
  if (folderId === undefined) return SIDEBAR_MY_SPACE_LABEL
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

function onFolderDragOver(folderId: string, position: 'before' | 'after' | 'inside') {
  if (!dragPayload.value) return
  if (folderId === MY_FOLDER_ID) {
    // 兼容历史虚拟根目录事件：任何位置都视为拖入根目录
    dragOverFolderId.value = folderId
    dragOverFolderPosition.value = null
    return
  }
  if (dragPayload.value.kind === 'folder' && dragPayload.value.id === folderId) return
  if (
    dragPayload.value.kind === 'folder' &&
    wouldCreateFolderCycle(store.folderList, dragPayload.value.id, folderId)
  ) {
    return
  }
  dragOverFolderId.value = folderId
  dragOverFolderPosition.value = position === 'inside' ? null : position
}

function onFolderDragLeave() {
  dragOverFolderId.value = null
  dragOverFolderPosition.value = null
}

function onDropOnFolder(folderId: string, position: 'before' | 'after' | 'inside') {
  dragOverFolderId.value = null
  dragOverFolderPosition.value = null
  const payload = dragPayload.value
  dragPayload.value = null
  if (!payload) return

  if (folderId === MY_FOLDER_ID) {
    // 兼容历史虚拟根目录事件：移动到根目录
    if (payload.kind === 'note') {
      store.moveNote(payload.id, undefined)
      showAppNotification(`已移动到：${SIDEBAR_MY_SPACE_LABEL}`)
    } else {
      const ok = store.moveFolder(payload.id, undefined)
      if (ok) showAppNotification(`文件夹已移动到：${SIDEBAR_MY_SPACE_LABEL}`)
    }
    persistSidebarState()
    return
  }

  if (payload.kind === 'note') {
    store.moveNote(payload.id, folderId)
    showAppNotification(`已移动到：${folderLabel(folderId)}`)
  } else if (payload.id !== folderId) {
    if (position === 'before' || position === 'after') {
      // 同级排序：将拖拽文件夹插入到目标文件夹的前/后位置
      const folder = store.folderList.find((f) => f.id === folderId)
      if (folder) {
        const parentId = folder.parentId
        const siblings = store.folderList
          .filter((f) => f.parentId === parentId)
          .sort((a, b) => a.order - b.order)
        const orderedIds = siblings.map((f) => f.id)
        const draggedIdx = orderedIds.indexOf(payload.id)
        if (draggedIdx !== -1) {
          orderedIds.splice(draggedIdx, 1)
        }
        const targetIdx = orderedIds.indexOf(folderId)
        const insertIdx = position === 'before' ? targetIdx : targetIdx + 1
        orderedIds.splice(insertIdx, 0, payload.id)
        store.reorderFolders(parentId, orderedIds)
      }
    } else {
      // 移动为子级
      const ok = store.moveFolder(payload.id, folderId)
      if (ok) showAppNotification(`文件夹已移动到：${folderLabel(folderId)}`)
    }
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
    showAppNotification(`已移动到：${SIDEBAR_MY_SPACE_LABEL}`)
  } else {
    const ok = store.moveFolder(payload.id, undefined)
    if (ok) showAppNotification(`文件夹已移动到：${SIDEBAR_MY_SPACE_LABEL}`)
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

watch(
  () => store.activeFolderId,
  (folderId) => {
    syncActiveSpaceId(folderId)
    if (!folderId || isVirtualFolder(folderId)) {
      syncExpandedSpaceIds()
      return
    }
    const next = new Set(expandedFolderIds.value)
    next.add(MY_FOLDER_ID)
    for (const id of collectAncestorFolderIds(folderId, store.folderList)) next.add(id)
    expandedFolderIds.value = next
    const topLevelSpaceId = resolveTopLevelSpaceId(folderId)
    if (topLevelSpaceId) {
      const nextSpace = new Set(expandedSpaceIds.value)
      nextSpace.add(topLevelSpaceId)
      expandedSpaceIds.value = nextSpace
    }
  }
)

watch(
  () => store.currentNote?.id,
  (noteId) => {
    if (!noteId) return
    const note = store.noteList.find((n) => n.id === noteId)
    if (!note) return
    const next = new Set(expandedFolderIds.value)
    next.add(MY_FOLDER_ID)
    for (const id of collectAncestorIdsForNote(note, store.folderList)) next.add(id)
    expandedFolderIds.value = next
    const topLevelSpaceId = resolveTopLevelSpaceId(note.folderId)
    if (topLevelSpaceId) {
      const nextSpace = new Set(expandedSpaceIds.value)
      nextSpace.add(topLevelSpaceId)
      expandedSpaceIds.value = nextSpace
    }
  }
)

watch(
  () => store.searchQuery,
  (query) => {
    if (!query.trim()) return
    const ids = collectExpandIdsForSearch(store.folderList, store.searchedNoteList)
    expandedFolderIds.value = new Set([...expandedFolderIds.value, MY_FOLDER_ID, ...ids])
  }
)

watch(
  () => store.sidebarStateRevision,
  () => {
    const settings = appSettings.get()
    const ids = new Set(settings.sidebarExpandedFolderIds ?? [])
    const spaceIds = new Set(settings.sidebarExpandedSpaceIds ?? [])
    // 备份恢复等配置重载场景同样需要容器展开迁移
    if (!settings.myFolderIntroMigrated) {
      ids.add(MY_FOLDER_ID)
      spaceIds.add(MY_FOLDER_ID)
      appSettings.save({ myFolderIntroMigrated: true })
    }
    expandedFolderIds.value = ids
    expandedSpaceIds.value = spaceIds
    if (settings.sidebarActiveFolderId !== undefined) {
      store.activeFolderId = settings.sidebarActiveFolderId
    }
    syncActiveSpaceId(store.activeFolderId)
  }
)

onMounted(() => {
  document.addEventListener('click', onGlobalClick)
  const settings = appSettings.get()
  // 只有在配置字段缺失（undefined）时才默认展开；
  // 若用户显式折叠导致配置为空数组（[]），应保持折叠状态。
  const expandedFromSettings = settings.sidebarExpandedFolderIds
  if (expandedFromSettings !== undefined) {
    const ids = new Set(expandedFromSettings)
    const spaceIds = new Set(settings.sidebarExpandedSpaceIds ?? [])
    // 老用户一次性迁移：旧配置中没有根空间 ID 时默认展开，
    // 避免升级后整个资料库在侧边栏不可见；迁移后用户手动折叠的意图正常保留
    if (!settings.myFolderIntroMigrated) {
      ids.add(MY_FOLDER_ID)
      spaceIds.add(MY_FOLDER_ID)
      appSettings.save({ myFolderIntroMigrated: true })
    }
    expandedFolderIds.value = ids
    expandedSpaceIds.value = spaceIds
  } else {
    // 首次启动：默认展开「我的空间」+ 一级文件夹（depth=0 且有子项的文件夹）
    const initialExpanded = new Set([MY_FOLDER_ID])
    const topLevelFolders = store.folderList.filter((f) => !f.parentId)
    for (const folder of topLevelFolders) {
      const hasChildren =
        store.folderList.some((f) => f.parentId === folder.id) ||
        store.noteList.some((n) => n.folderId === folder.id)
      if (hasChildren) {
        initialExpanded.add(folder.id)
      }
    }
    expandedFolderIds.value = initialExpanded
    expandedSpaceIds.value = new Set([MY_FOLDER_ID, ...topLevelFolders.filter((folder) => initialExpanded.has(folder.id)).map((folder) => folder.id)])
  }
  if (settings.sidebarActiveFolderId !== undefined) {
    store.activeFolderId = settings.sidebarActiveFolderId
  }
  syncActiveSpaceId(store.activeFolderId)
})

onUnmounted(() => document.removeEventListener('click', onGlobalClick))
</script>

<style scoped>
/* 回收站底部栏 */
.sidebar-bottom-bar {
  padding: 8px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.sidebar-bottom-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 13px;
  transition: all 0.2s;
}

.sidebar-bottom-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.sidebar-bottom-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.sidebar-storage-caption {
  margin: 6px 4px 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--text-muted, var(--text-secondary));
}

.trash-btn.has-items {
  color: var(--color-warning);
}

.trash-btn.has-items:hover {
  color: var(--color-warning);
  border-color: var(--color-warning);
}

.trash-badge {
  background: var(--color-danger);
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  margin-left: auto;
}

.trash-label {
  flex: 1;
  text-align: left;
}

/* 批量操作工具栏 */
.sidebar-batch-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--color-primary, #4f8cff) 8%, transparent);
  border-bottom: 1px solid var(--border-color);
}

.batch-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.batch-btn {
  padding: 4px 12px;
  font-size: 12px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.batch-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
</style>

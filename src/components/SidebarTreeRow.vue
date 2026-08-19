<template>
  <!-- 置顶区分隔线（PRD 要求分区标题为「常用文件夹」） -->
  <div v-if="row.isPinnedSeparator" class="pinned-separator" :style="rowStyle">
    <span class="pinned-separator-label">常用文件夹</span>
  </div>

  <!-- 文件夹行 -->
  <div
    v-else-if="row.kind === 'folder'"
    class="folder-item"
    :class="{
      active: !row.isSystemFolder && activeFolderId === row.folder!.id,
      'drag-over': !row.isSystemFolder && dragOverFolderId === row.folder!.id,
      'drag-over-top': !row.isSystemFolder && dragOverFolderId === row.folder!.id && dragOverFolderPosition === 'before',
      'drag-over-bottom': !row.isSystemFolder && dragOverFolderId === row.folder!.id && dragOverFolderPosition === 'after',
      'is-empty': (row.noteCount ?? 0) === 0,
      'system-folder': row.isSystemFolder,
      'pinned-folder': row.folder?.pinned,
    }"
    :data-folder-id="row.folder?.id"
    :style="rowStyle"
    :draggable="!row.isSystemFolder"
    @click="$emit('folder-click', row.folder!.id, row.hasChildren)"
    @dblclick.stop="!row.isSystemFolder && $emit('start-rename-folder', row.folder!)"
    @contextmenu.prevent="!row.isSystemFolder && $emit('folder-context', $event, row.folder!.id)"
    @dragstart.stop="!row.isSystemFolder && onDragStart('folder', row.folder!.id, $event)"
    @dragover.prevent.stop="!row.isSystemFolder && onFolderDragOver($event, row.folder!.id)"
    @dragleave.stop="!row.isSystemFolder && $emit('drag-leave-folder')"
    @drop.prevent.stop="!row.isSystemFolder && onFolderDrop($event, row.folder!.id)"
  >
    <button
      v-if="row.hasChildren"
      type="button"
      class="folder-toggle"
      :aria-expanded="expanded"
      @click.stop="$emit('toggle-expand', row.folder!.id)"
    >
      <AppIcon :name="expanded ? 'chevron-down' : 'chevron-right'" :size="12" />
    </button>
    <span v-else class="folder-toggle-spacer" aria-hidden="true" />
    <span
      v-if="row.folder?.pinned && !row.isSystemFolder"
      class="folder-pin-icon"
      title="已置顶"
      aria-label="已置顶"
    >
      <AppIcon name="pin" :size="12" />
    </span>
    <AppIcon
      name="folder"
      :size="14"
      class="folder-icon"
    />
    <input
      v-if="!row.isSystemFolder && renamingFolderId === row.folder!.id"
      :value="renamingFolderName"
      class="rename-input"
      autofocus
      @input="$emit('update:renamingFolderName', ($event.target as HTMLInputElement).value)"
      @keyup.enter="$emit('commit-rename-folder')"
      @keyup.escape="$emit('cancel-rename-folder')"
      @blur="$emit('commit-rename-folder')"
      @click.stop
    />
    <span v-else class="folder-name">{{ row.folder!.name }}</span>
    <span v-if="(row.noteCount ?? 0) > 0" class="folder-note-count">{{ row.noteCount }}</span>
  </div>

  <!-- 笔记行 -->
  <div
    v-else
    class="note-item tree-note-item"
    :class="{
      active: currentNoteId === row.note!.id,
      pinned: row.note!.pinned,
      selected: selectedNoteIds?.has(row.note!.id) ?? false,
      highlighted: highlightedNoteId === row.note!.id,
      'drag-over-top': dragOverNoteId === row.note!.id && dragOverNotePosition === 'before',
      'drag-over-bottom': dragOverNoteId === row.note!.id && dragOverNotePosition === 'after',
    }"
    :data-note-id="row.note!.id"
    :style="rowStyle"
    draggable="true"
    @click="onNoteClick($event, row.note!.id)"
    @dblclick.stop="$emit('start-rename-note', row.note!.id)"
    @contextmenu.prevent="$emit('note-context', $event, row.note!.id)"
    @dragstart.stop="onDragStart('note', row.note!.id, $event)"
    @dragover.prevent.stop="onNoteDragOver($event, row.note!.id)"
    @dragleave.stop="$emit('drag-leave-note')"
    @drop.prevent.stop="onNoteDrop($event, row.note!.id)"
  >
    <span v-if="row.note!.pinned" class="note-pin-icon" title="已置顶" aria-label="已置顶">
      <AppIcon name="pin" :size="12" />
    </span>
    <input
      v-if="renamingNoteId === row.note!.id"
      :value="renamingNoteName"
      class="rename-input note-rename-input"
      autofocus
      @input="$emit('update:renamingNoteName', ($event.target as HTMLInputElement).value)"
      @keyup.enter="$emit('commit-rename-note')"
      @keyup.escape="$emit('cancel-rename-note')"
      @blur="$emit('commit-rename-note')"
      @click.stop
    />
    <div v-else class="note-title">{{ row.note!.title }}</div>
    <div class="note-meta">{{ formatRelativeTime(row.note!.updatedAt) }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SidebarTreeRow } from '../utils/sidebarTree'
import { formatRelativeTime } from '../utils/formatRelativeTime'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  row: SidebarTreeRow
  expanded: boolean
  activeFolderId: string | null
  currentNoteId?: string
  renamingFolderId: string | null
  renamingFolderName: string
  renamingNoteId: string | null
  renamingNoteName: string
  dragOverFolderId: string | null
  dragOverNoteId?: string | null
  dragOverNotePosition?: 'before' | 'after' | null
  dragOverFolderPosition?: 'before' | 'after' | null
  highlightedNoteId?: string | null
  selectedNoteIds?: Set<string>
  virtual?: boolean
  virtualStyle?: Record<string, string>
}>()

const emit = defineEmits<{
  'folder-click': [folderId: string, hasChildren: boolean]
  'toggle-expand': [folderId: string]
  'folder-context': [event: MouseEvent, folderId: string]
  'commit-rename-folder': []
  'cancel-rename-folder': []
  'start-rename-folder': [folder: { id: string; name: string }]
  'note-click': [noteId: string]
  'note-ctrl-click': [noteId: string]
  'start-rename-note': [noteId: string]
  'commit-rename-note': []
  'cancel-rename-note': []
  'note-context': [event: MouseEvent, noteId: string]
  'drag-start': [payload: { kind: 'note' | 'folder'; id: string }]
  'drag-over-folder': [folderId: string, position: 'before' | 'after' | 'inside']
  'drag-leave-folder': []
  'drop-on-folder': [folderId: string, position: 'before' | 'after' | 'inside']
  'drag-over-note': [noteId: string, position: 'before' | 'after']
  'drag-leave-note': []
  'drop-on-note': [noteId: string, position: 'before' | 'after']
  'update:renamingFolderName': [value: string]
  'update:renamingNoteName': [value: string]
}>()

const rowStyle = computed(() => {
  const isNote = props.row.kind === 'note'
  // 笔记行无折叠按钮，需补偿 folder-toggle(16px) + gap(6px) 的宽度，使文字与文件夹对齐
  // 若 style.css 中 .folder-toggle 或 .folder-item gap 变更，此处需同步更新
  const toggleArea = isNote ? 22 : 0
  const pad = 12 + props.row.depth * 16 + toggleArea
  const base: Record<string, string> = { paddingLeft: `${pad}px` }
  if (props.virtual && props.virtualStyle) {
    return { ...base, ...props.virtualStyle, position: 'absolute', left: '0', right: '0' }
  }
  return base
})

function onDragStart(kind: 'note' | 'folder', id: string, e: DragEvent) {
  e.dataTransfer?.setData('text/plain', `${kind}:${id}`)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  emit('drag-start', { kind, id })
}

/** 笔记拖放位置：上半部分 = before，下半部分 = after */
function noteDropPosition(e: DragEvent): 'before' | 'after' {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  return e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
}

/** 文件夹拖放位置：上 25% = before，下 25% = after，中间 = inside */
function folderDropPosition(e: DragEvent): 'before' | 'after' | 'inside' {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const relativeY = e.clientY - rect.top
  const threshold = rect.height * 0.25
  if (relativeY < threshold) return 'before'
  if (relativeY > rect.height - threshold) return 'after'
  return 'inside'
}

function onFolderDragOver(e: DragEvent, folderId: string) {
  emit('drag-over-folder', folderId, folderDropPosition(e))
}

function onFolderDrop(e: DragEvent, folderId: string) {
  emit('drop-on-folder', folderId, folderDropPosition(e))
}

function onNoteClick(e: MouseEvent, noteId: string) {
  if (e.ctrlKey || e.metaKey) {
    emit('note-ctrl-click', noteId)
  } else {
    emit('note-click', noteId)
  }
}

function onNoteDragOver(e: DragEvent, noteId: string) {
  emit('drag-over-note', noteId, noteDropPosition(e))
}

function onNoteDrop(e: DragEvent, noteId: string) {
  emit('drop-on-note', noteId, noteDropPosition(e))
}
</script>
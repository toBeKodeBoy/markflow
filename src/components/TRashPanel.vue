<template>
  <Teleport to="body" :disabled="embedded">
    <div
      v-if="visible"
      :class="embedded ? 'trash-panel-main' : 'trash-overlay'"
      :data-testid="embedded ? 'workspace-trash-panel' : undefined"
      @click.self="onOverlayClick"
    >
      <div class="trash-panel-modal" :class="{ 'is-embedded': embedded }">
        <!-- 头部 -->
        <div class="trash-header">
          <div class="trash-header-left">
            <AppIcon name="trash" class="trash-icon" />
            <h3 class="trash-title">回收站</h3>
            <span v-if="totalCount > 0" class="trash-count">{{ totalCount }}</span>
          </div>
          <div class="trash-header-right">
            <button
              v-if="totalCount > 0"
              class="trash-clear-btn"
              title="清空回收站"
              @click="handleClearTrash"
            >
              清空
            </button>
            <button class="trash-close-btn" title="关闭" @click="$emit('close')">
              <AppIcon name="close" :size="16" />
            </button>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="totalCount === 0" class="trash-empty">
          <AppIcon name="trash" class="trash-empty-icon" />
          <p>回收站为空</p>
          <p class="trash-empty-hint">删除的笔记和文件夹会在这里保留 30 天</p>
        </div>

        <!-- 回收站列表 -->
        <div v-else class="trash-list">
          <!-- 文件夹条目 -->
          <div
            v-for="entry in trashFolders"
            :key="'folder-' + entry.folder.id"
            class="trash-item trash-folder-item"
          >
            <div class="trash-item-header">
              <div class="trash-item-name-row">
                <AppIcon name="folder" :size="14" class="trash-folder-icon" />
                <span class="trash-note-title">{{ entry.folder.name }}</span>
              </div>
              <span class="trash-time">
                {{ formatRelativeTime(entry.deletedAt) }}
              </span>
            </div>
            <div class="trash-folder-meta">
              包含 {{ entry.descendantFolders.length }} 个子文件夹、{{ entry.noteIds.length }} 篇笔记
            </div>
            <div class="trash-item-actions">
              <button class="btn-restore" @click="handleRestoreFolder(entry.folder.id)">
                恢复
              </button>
              <button class="btn-delete" @click="handlePermanentDeleteFolder(entry.folder.id)">
                彻底删除
              </button>
            </div>
          </div>

          <!-- 笔记条目 -->
          <div
            v-for="note in trashNotes"
            :key="'note-' + note.id"
            class="trash-item"
          >
            <div class="trash-item-header">
              <span class="trash-note-title">{{ note.title }}</span>
              <span class="trash-time">
                {{ formatRelativeTime(note.deletedAt ?? Date.now()) }}
              </span>
            </div>
            <div class="trash-item-actions">
              <button class="btn-restore" @click="handleRestore(note.id)">
                恢复
              </button>
              <button class="btn-delete" @click="handlePermanentDelete(note.id)">
                彻底删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNoteStore } from '../stores/note'
import { showAppNotification } from '../utils/notify'
import { formatRelativeTime } from '../utils/formatRelativeTime'
import AppIcon from './AppIcon.vue'

const store = useNoteStore()
const props = defineProps<{
  visible: boolean
  embedded?: boolean
}>()
const emit = defineEmits<{
  close: []
  'restore-note': [id: string]
  'permanent-delete-note': [id: string]
  'restore-folder': [id: string]
  'permanent-delete-folder': [id: string]
  'clear-all': []
}>()

// 回收站笔记列表（按删除时间倒序）
// 依赖 trashVersion：存储层数据非响应式，需通过版本号触发重新计算
const trashNotes = computed(() => {
  void store.trashVersion
  return [...store.getTrashNotes()].sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))
})

// 回收站文件夹列表（按删除时间倒序）
const trashFolders = computed(() => {
  void store.trashVersion
  return [...store.getTrashFolders()].sort((a, b) => b.deletedAt - a.deletedAt)
})

const totalCount = computed(() => trashNotes.value.length + trashFolders.value.length)

function onOverlayClick() {
  if (!props.embedded) emit('close')
}

// 恢复笔记
function handleRestore(id: string) {
  const restored = store.restoreNote(id)
  if (restored) {
    showAppNotification(`已恢复「${restored.title}」`)
    emit('restore-note', id)
  }
}

// 永久删除笔记
function handlePermanentDelete(id: string) {
  if (!confirm('此操作不可撤销，确定要永久删除吗？')) return
  store.permanentDeleteNote(id)
  showAppNotification('已永久删除')
  emit('permanent-delete-note', id)
}

// 恢复文件夹
function handleRestoreFolder(id: string) {
  const restored = store.restoreFolder(id)
  if (restored) {
    showAppNotification(`已恢复文件夹「${restored.name}」`)
    emit('restore-folder', id)
  }
}

// 永久删除文件夹
function handlePermanentDeleteFolder(id: string) {
  if (!confirm('此操作不可撤销，确定要永久删除该文件夹及其所有内容吗？')) return
  store.permanentDeleteFolder(id)
  showAppNotification('已永久删除文件夹')
  emit('permanent-delete-folder', id)
}

// 清空回收站
function handleClearTrash() {
  if (!confirm('确定要清空回收站吗？所有笔记和文件夹将永久删除且不可恢复。')) return
  store.clearTrash()
  store.clearTrashFolders()
  showAppNotification('已清空回收站')
  emit('clear-all')
}
</script>

<style scoped>
.trash-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.trash-panel-main {
  height: 100%;
  min-height: 0;
}

.trash-panel-modal {
  width: 480px;
  max-width: 90vw;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary, var(--bg-editor, #fff));
  border: 1px solid var(--border-color, var(--border, #ddd));
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.trash-panel-modal.is-embedded {
  width: 100%;
  max-width: none;
  max-height: none;
  height: 100%;
  border-radius: 0;
  box-shadow: none;
}

.trash-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, var(--border, #ddd));
  flex-shrink: 0;
}

.trash-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trash-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trash-icon {
  width: 20px;
  height: 20px;
  color: var(--text-secondary, var(--text-muted, #999));
}

.trash-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, var(--text, #333));
}

.trash-count {
  background: var(--color-primary, var(--primary, #4f8cff));
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.trash-clear-btn {
  padding: 6px 12px;
  font-size: 12px;
  color: var(--text-secondary, var(--text-muted, #999));
  background: transparent;
  border: 1px solid var(--border-color, var(--border, #ddd));
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.trash-clear-btn:hover {
  color: var(--color-danger, var(--danger, #e74c3c));
  border-color: var(--color-danger, var(--danger, #e74c3c));
}

.trash-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-secondary, var(--text-muted, #999));
  transition: all 0.2s;
}

.trash-close-btn:hover {
  background: var(--bg-hover, rgba(0, 0, 0, 0.06));
  color: var(--text-primary, var(--text, #333));
}

.trash-empty {
  padding: 60px 20px;
  text-align: center;
  color: var(--text-secondary, var(--text-muted, #999));
}

.trash-empty-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  opacity: 0.3;
}

.trash-empty p {
  margin: 8px 0;
  font-size: 14px;
}

.trash-empty-hint {
  font-size: 12px;
  opacity: 0.7;
}

.trash-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.trash-item {
  padding: 12px;
  margin-bottom: 8px;
  background: var(--bg-tertiary, var(--bg-hover, rgba(0, 0, 0, 0.03)));
  border-radius: 6px;
  transition: all 0.2s;
}

.trash-item:hover {
  background: var(--bg-hover, rgba(0, 0, 0, 0.06));
}

.trash-item:last-child {
  margin-bottom: 0;
}

.trash-folder-item {
  border-left: 3px solid var(--color-primary, var(--primary, #4f8cff));
}

.trash-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.trash-item-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  overflow: hidden;
}

.trash-folder-icon {
  flex-shrink: 0;
  color: var(--text-secondary, var(--text-muted, #999));
}

.trash-note-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, var(--text, #333));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.trash-time {
  font-size: 12px;
  color: var(--text-secondary, var(--text-muted, #999));
  white-space: nowrap;
}

.trash-folder-meta {
  font-size: 11px;
  color: var(--text-secondary, var(--text-muted, #999));
  margin-bottom: 8px;
}

.trash-item-actions {
  display: flex;
  gap: 8px;
}

.trash-item-actions button {
  flex: 1;
  padding: 6px 12px;
  font-size: 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-restore {
  background: var(--color-primary, var(--primary, #4f8cff));
  color: white;
}

.btn-restore:hover {
  filter: brightness(1.1);
}

.btn-delete {
  background: transparent;
  color: var(--color-danger, var(--danger, #e74c3c));
  border: 1px solid var(--color-danger, var(--danger, #e74c3c));
}

.btn-delete:hover {
  background: var(--color-danger, var(--danger, #e74c3c));
  color: white;
}

/* 暗色主题适配 */
[data-theme="dark"] .trash-panel-modal {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
</style>

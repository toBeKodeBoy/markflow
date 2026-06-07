<template>
  <aside class="sidebar">
    <!-- Search -->
    <div class="sidebar-search">
      <input
        v-model="store.searchQuery"
        type="text"
        placeholder="搜索笔记..."
        class="search-input"
      />
    </div>

    <!-- All Notes -->
    <div class="sidebar-section">
      <div class="section-header" @click="store.activeFolderId = null">
        <span class="section-icon">📝</span>
        <span class="section-title">全部笔记</span>
        <span class="count">{{ store.noteList.length }}</span>
      </div>
    </div>

    <!-- Folders -->
    <div class="sidebar-section">
      <div class="section-header folders-header">
        <span class="section-icon">📁</span>
        <span class="section-title">文件夹</span>
        <button class="btn-icon" @click.stop="showNewFolder = true" title="新建文件夹">+</button>
      </div>

      <!-- New Folder Input -->
      <div v-if="showNewFolder" class="new-folder-input">
        <input
          ref="folderInputRef"
          v-model="newFolderName"
          type="text"
          placeholder="文件夹名称"
          @keyup.enter="createFolder"
          @keyup.escape="showNewFolder = false"
          @blur="createFolder"
        />
      </div>

      <div
        v-for="folder in store.folderList"
        :key="folder.id"
        class="folder-item"
        :class="{ active: store.activeFolderId === folder.id }"
        @click="store.activeFolderId = folder.id"
        @dblclick="startRenameFolder(folder)"
        @contextmenu.prevent="showFolderMenu(folder)"
      >
        <span class="folder-icon">▸</span>
        <input
          v-if="renamingFolderId === folder.id"
          v-model="renamingFolderName"
          class="rename-input"
          @keyup.enter="commitRenameFolder"
          @keyup.escape="renamingFolderId = null"
          @blur="commitRenameFolder"
          @click.stop
        />
        <span v-else class="folder-name">{{ folder.name }}</span>
        <button class="btn-icon danger" @click.stop="store.deleteFolder(folder.id)" title="删除">×</button>
      </div>
    </div>

    <!-- Note List -->
    <div class="note-list">
      <div
        v-for="note in store.filteredNoteList"
        :key="note.id"
        class="note-item"
        :class="{ active: store.currentNote?.id === note.id }"
        @click="store.openNote(note.id)"
        @contextmenu.prevent="noteContextId = note.id"
      >
        <div class="note-title">{{ note.title }}</div>
        <div class="note-meta">{{ formatDate(note.updatedAt) }}</div>
        <!-- Context Menu -->
        <div v-if="noteContextId === note.id" class="context-menu" @click.stop>
          <button @click="startRenameNote(note.id)">重命名</button>
          <button @click="startMoveNote(note.id)">移动到</button>
          <button class="danger" @click="deleteNote(note.id)">删除</button>
        </div>
      </div>
      <div v-if="store.filteredNoteList.length === 0" class="empty-tip">
        暂无笔记，点击右上角新建
      </div>
    </div>

    <!-- Rename Note Modal -->
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

    <!-- Move Note Modal -->
    <div v-if="movingNoteId" class="modal-overlay" @click.self="closeMoveModal">
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
            v-for="folder in store.folderList"
            :key="folder.id"
            class="move-folder-item"
            :class="{ current: movingNoteFolderId === folder.id }"
            :disabled="movingNoteFolderId === folder.id"
            @click="commitMoveNote(folder.id)"
          >
            {{ folder.name }}
            <span v-if="movingNoteFolderId === folder.id" class="move-folder-tag">当前</span>
          </button>
        </div>
        <div class="modal-actions">
          <button @click="closeMoveModal">取消</button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useNoteStore } from '../stores/note'
import { showAppNotification } from '../utils/notify'

const store = useNoteStore()

const showNewFolder = ref(false)
const newFolderName = ref('')
const folderInputRef = ref<HTMLInputElement>()
const renamingFolderId = ref<string | null>(null)
const renamingFolderName = ref('')
const noteContextId = ref<string | null>(null)
const renamingNoteId = ref<string | null>(null)
const renamingNoteName = ref('')
const movingNoteId = ref<string | null>(null)
const movingNoteFolderId = ref<string | undefined>(undefined)

watch(showNewFolder, async (val) => {
  if (val) {
    await nextTick()
    folderInputRef.value?.focus()
  }
})

function createFolder() {
  if (newFolderName.value.trim()) {
    store.createFolder(newFolderName.value.trim())
  }
  newFolderName.value = ''
  showNewFolder.value = false
}

function startRenameFolder(folder: { id: string; name: string }) {
  renamingFolderId.value = folder.id
  renamingFolderName.value = folder.name
}

function commitRenameFolder() {
  if (renamingFolderId.value && renamingFolderName.value.trim()) {
    store.renameFolder(renamingFolderId.value, renamingFolderName.value.trim())
  }
  renamingFolderId.value = null
}

function showFolderMenu(folder: { id: string }) {
  // simple: just delete on right click for now
  if (confirm('删除文件夹？')) store.deleteFolder(folder.id)
}

function startRenameNote(id: string) {
  const note = store.noteList.find(n => n.id === id)
  if (note) {
    renamingNoteId.value = id
    renamingNoteName.value = note.title
  }
  noteContextId.value = null
}

function commitRenameNote() {
  if (renamingNoteId.value && renamingNoteName.value.trim()) {
    store.renameNote(renamingNoteId.value, renamingNoteName.value.trim())
  }
  renamingNoteId.value = null
}

function startMoveNote(id: string) {
  const note = store.noteList.find(n => n.id === id)
  if (!note) return
  movingNoteId.value = id
  movingNoteFolderId.value = note.folderId
  noteContextId.value = null
}

function folderLabel(folderId: string | undefined) {
  if (folderId === undefined) return '无文件夹（根目录）'
  return store.folderList.find(f => f.id === folderId)?.name ?? '未知文件夹'
}

function commitMoveNote(folderId: string | undefined) {
  if (!movingNoteId.value) return
  if (movingNoteFolderId.value === folderId) return

  store.moveNote(movingNoteId.value, folderId)
  showAppNotification(`已移动到：${folderLabel(folderId)}`)
  closeMoveModal()
}

function closeMoveModal() {
  movingNoteId.value = null
  movingNoteFolderId.value = undefined
}

function deleteNote(id: string) {
  noteContextId.value = null
  store.deleteNote(id)
}

function formatDate(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('zh', { hour: '2-digit', minute: '2-digit' })
  if (diffDays < 7) return `${diffDays}天前`
  return d.toLocaleDateString('zh', { month: 'short', day: 'numeric' })
}

function onGlobalClick() {
  noteContextId.value = null
}

onMounted(() => document.addEventListener('click', onGlobalClick))
onUnmounted(() => document.removeEventListener('click', onGlobalClick))
</script>

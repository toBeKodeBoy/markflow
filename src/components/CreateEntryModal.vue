<template>
  <div
    v-if="visible"
    class="modal-overlay create-entry-overlay"
    @click.self="emit('cancel')"
  >
    <div
      class="modal create-entry-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-entry-title"
    >
      <div class="create-entry-header">
        <div>
          <div id="create-entry-title" class="modal-title">新建内容</div>
          <p class="create-entry-subtitle">统一创建文件与文件夹，保持目录结构清晰。</p>
        </div>
      </div>

      <div class="create-entry-kind-grid">
        <button
          type="button"
          class="create-entry-kind-card"
          :class="{ active: kind === 'note' }"
          @click="kind = 'note'"
        >
          <span class="create-entry-kind-icon">
            <AppIcon name="file" :size="18" />
          </span>
          <span class="create-entry-kind-title">新建文件</span>
          <span class="create-entry-kind-desc">创建空白 Markdown 笔记</span>
        </button>
        <button
          type="button"
          class="create-entry-kind-card"
          :class="{ active: kind === 'folder' }"
          @click="kind = 'folder'"
        >
          <span class="create-entry-kind-icon">
            <AppIcon name="folder" :size="18" />
          </span>
          <span class="create-entry-kind-title">新建文件夹</span>
          <span class="create-entry-kind-desc">建立新的内容分组层级</span>
        </button>
      </div>

      <form class="create-entry-form" @submit.prevent="submit">
        <label v-if="kind === 'folder'" class="create-entry-field">
          <span class="create-entry-label">名称</span>
          <input
            ref="nameInputRef"
            v-model="name"
            class="modal-input create-entry-input"
            type="text"
            placeholder="输入文件夹名称"
          />
        </label>

        <div class="create-entry-field">
          <span class="create-entry-label">目标位置</span>
          <div v-if="lockedParentId !== undefined" class="create-entry-location">
            <span class="create-entry-location-pill">{{ currentParentLabel }}</span>
          </div>
          <select
            v-else
            v-model="parentValue"
            class="create-entry-select"
          >
            <option value="__root__">{{ myFolderName }}</option>
            <option
              v-for="option in folderOptions"
              :key="option.folder.id"
              :value="option.folder.id"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <div v-if="kind === 'note'" class="create-entry-field" data-testid="create-entry-templates">
          <span class="create-entry-label">从模板创建</span>
          <div class="create-entry-template-grid">
            <button
              type="button"
              class="create-entry-template-chip"
              :class="{ active: templateId === null }"
              data-testid="create-entry-template-blank"
              @click="templateId = null"
            >
              空白笔记
            </button>
            <button
              v-for="item in NOTE_TEMPLATES"
              :key="item.id"
              type="button"
              class="create-entry-template-chip"
              :class="{ active: templateId === item.id }"
              data-testid="create-entry-template-option"
              @click="templateId = item.id"
            >
              {{ item.title }}
            </button>
          </div>
        </div>

        <p v-if="kind === 'note'" class="create-entry-hint">
          {{ noteHint }}
        </p>

        <div class="modal-actions">
          <button
            ref="submitButtonRef"
            class="btn-primary"
            type="submit"
            :disabled="!canSubmit"
          >
            {{ kind === 'note' ? '新建文件' : '新建文件夹' }}
          </button>
          <button type="button" @click="emit('cancel')">取消</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Folder } from '../types'
import { flattenFolderTree, getFolderPathLabel } from '../utils/folderTree'
import { useNoteStore } from '../stores/note'
import { MY_FOLDER_NAME } from '../constants/myFolder'
import { NOTE_TEMPLATES, type NoteTemplateId } from '../constants/noteTemplates'
import { createNoteFromTemplate } from '../utils/createFromTemplate'
import AppIcon from './AppIcon.vue'

type CreateEntryKind = 'note' | 'folder'

const ROOT_VALUE = '__root__'
// 根目录对外统一展示为「我的文件夹」
const myFolderName = MY_FOLDER_NAME

const props = defineProps<{
  visible: boolean
  defaultKind: CreateEntryKind
  defaultParentId?: string
  lockedParentId?: string | null
  folders: Folder[]
  activeFolderId?: string | null
}>()

const emit = defineEmits<{
  cancel: []
  created: [payload: { kind: CreateEntryKind; id: string; parentId?: string }]
}>()

const store = useNoteStore()
const kind = ref<CreateEntryKind>('note')
const name = ref('')
const templateId = ref<NoteTemplateId | null>(null)
const parentValue = ref(ROOT_VALUE)
const nameInputRef = ref<HTMLInputElement | null>(null)
const submitButtonRef = ref<HTMLButtonElement | null>(null)

const folderOptions = computed(() =>
  flattenFolderTree(props.folders, new Set(props.folders.map((folder) => folder.id))).map((row) => ({
    folder: row.folder,
    label: `${'　'.repeat(row.depth)}${row.folder.name}`,
  }))
)

const resolvedParentId = computed(() => {
  if (props.lockedParentId !== undefined) return props.lockedParentId ?? undefined
  if (parentValue.value === ROOT_VALUE) return undefined
  return parentValue.value
})

const currentParentLabel = computed(() => {
  if (resolvedParentId.value === undefined) return MY_FOLDER_NAME
  return getFolderPathLabel(props.folders, resolvedParentId.value) || MY_FOLDER_NAME
})

const canSubmit = computed(() => kind.value === 'note' || name.value.trim().length > 0)

const noteHint = computed(() => {
  if (!templateId.value) return '将创建一份空白 Markdown 笔记，标题可在创建后直接重命名。'
  const template = NOTE_TEMPLATES.find((item) => item.id === templateId.value)
  return template
    ? `将按「${template.title}」模板创建笔记，创建后可直接重命名。`
    : '将创建一份空白 Markdown 笔记，标题可在创建后直接重命名。'
})

function resetState() {
  kind.value = props.defaultKind
  name.value = ''
  templateId.value = null
  const nextParentId = props.lockedParentId !== undefined
    ? props.lockedParentId ?? undefined
    : props.defaultParentId ?? props.activeFolderId ?? undefined
  parentValue.value = nextParentId ?? ROOT_VALUE
}

async function focusPrimaryField() {
  await nextTick()
  if (kind.value === 'folder') {
    nameInputRef.value?.focus()
    nameInputRef.value?.select()
    return
  }
  submitButtonRef.value?.focus()
}

async function handleOpen() {
  resetState()
  await focusPrimaryField()
}

async function submit() {
  if (!canSubmit.value) return
  if (kind.value === 'note') {
    const note = templateId.value
      ? createNoteFromTemplate(templateId.value, resolvedParentId.value)
      : store.createNote(resolvedParentId.value)
    if (!note) return
    emit('created', { kind: 'note', id: note.id, parentId: note.folderId })
    return
  }

  const folder = store.createFolder(name.value.trim(), resolvedParentId.value)
  // 修复（Code Review #4）：createFolder 超深度时返回 null，创建失败时保持弹窗不关闭
  if (!folder) return
  emit('created', { kind: 'folder', id: folder.id, parentId: folder.parentId })
}

function onWindowKeydown(event: KeyboardEvent) {
  if (!props.visible) return
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('cancel')
  }
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    await handleOpen()
  },
  { immediate: true }
)

watch(kind, async () => {
  if (!props.visible) return
  await focusPrimaryField()
})

watch(
  () => props.lockedParentId,
  () => {
    if (!props.visible) return
    resetState()
  }
)

onMounted(async () => {
  window.addEventListener('keydown', onWindowKeydown)
  if (props.visible) {
    await handleOpen()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeydown)
})
</script>

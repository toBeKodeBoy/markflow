<template>
  <div v-if="visible" class="modal-overlay" @click.self="canClose && emit('cancel')">
    <div class="modal import-folder-modal" role="dialog" aria-labelledby="import-folder-title">
      <div id="import-folder-title" class="modal-title">导入文件夹</div>

      <template v-if="phase === 'preview'">
        <p v-if="scan" class="import-folder-summary">
          已扫描 <strong>{{ scan.files.length }}</strong> 个可导入文件
          <span v-if="scan.rootPath">（{{ folderLabel }}）</span>
        </p>

        <label class="import-option-row">
          <input v-model="draft.replaceExisting" type="checkbox" />
          <span>替换现有笔记（清空后导入）</span>
        </label>

        <div v-if="draft.replaceExisting" class="import-folder-tip import-folder-warning">
          将删除全部笔记、文件夹与图片，仅保留应用设置。此操作不可撤销。
        </div>

        <label class="import-option-row">
          <input v-model="draft.preserveStructure" type="checkbox" />
          <span>保留目录结构</span>
        </label>

        <label v-if="!draft.preserveStructure && !draft.replaceExisting" class="import-option-row">
          <span class="import-option-label">导入到</span>
          <select v-model="targetMode" class="import-option-select">
            <option value="active">当前选中文件夹</option>
            <option value="new">新建文件夹（以源文件夹命名）</option>
          </select>
        </label>

        <label v-if="!draft.replaceExisting" class="import-option-row">
          <span class="import-option-label">重名笔记</span>
          <select v-model="draft.onConflict" class="import-option-select">
            <option value="rename">自动重命名</option>
            <option value="skip">跳过</option>
          </select>
        </label>

        <label class="import-option-row">
          <input v-model="draft.importImages" type="checkbox" />
          <span>导入图片（含文件夹内 png/jpg 及 Markdown 引用）</span>
        </label>

        <div v-if="isDevWithoutImages && draft.importImages" class="import-folder-tip">
          浏览器开发模式下图片依赖文件夹内完整路径，部分图片可能无法导入。
        </div>

        <div v-if="scan && scan.files.length" class="import-file-tree">
          <div class="import-file-list-header">
            <label>
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate.prop="someSelected && !allSelected"
                @change="toggleSelectAll"
              />
              选择文件（{{ selectedCount }} / {{ scan.files.length }}）
            </label>
          </div>
          <ul>
            <li
              v-for="row in visibleRows"
              :key="row.node.path"
              class="import-tree-row"
              :class="{ 'is-folder': row.node.kind === 'folder' }"
              :style="{ paddingLeft: 10 + row.depth * 16 + 'px' }"
            >
              <button
                v-if="row.node.kind === 'folder'"
                type="button"
                class="import-tree-toggle"
                :aria-expanded="expandedPaths.has(row.node.path)"
                @click.stop="toggleExpand(row.node.path)"
              >{{ expandedPaths.has(row.node.path) ? '▾' : '▸' }}</button>
              <span v-else class="import-tree-toggle-spacer" aria-hidden="true" />

              <input
                type="checkbox"
                :checked="row.node.kind === 'file' ? selected.has(row.node.path) : folderCheckState(row.node) === 'all'"
                :indeterminate.prop="row.node.kind === 'folder' && folderCheckState(row.node) === 'some'"
                @change="toggleNode(row.node, $event)"
                @click.stop
              />

              <button
                type="button"
                class="import-tree-label"
                @click="onRowClick(row.node)"
              >
                <span class="import-tree-icon">{{ row.node.kind === 'folder' ? '📁' : '📄' }}</span>
                <span class="import-tree-name">{{ row.node.name }}</span>
                <span
                  v-if="row.node.kind === 'folder' && !expandedPaths.has(row.node.path)"
                  class="import-tree-count"
                >{{ countFiles(row.node) }}</span>
              </button>
            </li>
          </ul>
        </div>

        <p v-else-if="scan" class="import-folder-empty">未找到可导入的文件</p>

        <div class="modal-actions">
          <button class="btn-primary" :disabled="!canStart" @click="startImport">开始导入</button>
          <button @click="emit('cancel')">取消</button>
        </div>
      </template>

      <template v-else-if="phase === 'importing'">
        <p class="import-progress-text">
          正在导入… {{ progress.current }} / {{ progress.total }}
        </p>
        <div class="import-progress-bar">
          <div class="import-progress-fill" :style="{ width: progressPercent + '%' }" />
        </div>
        <p class="import-progress-path">{{ progress.path }}</p>
      </template>

      <template v-else-if="phase === 'done' && result">
        <p class="import-result-summary">
          导入完成：成功 {{ result.imported }}，跳过 {{ result.skipped }}，失败 {{ result.failed.length }}
        </p>
        <ul v-if="result.foldersCreated || result.imagesImported" class="import-result-meta">
          <li v-if="result.foldersCreated">新建文件夹 {{ result.foldersCreated }} 个</li>
          <li v-if="result.imagesImported">导入图片 {{ result.imagesImported }} 张</li>
        </ul>
        <ul v-if="result.failed.length" class="import-result-failures">
          <li v-for="item in result.failed" :key="item.path">
            {{ item.path }}：{{ item.reason }}
          </li>
        </ul>
        <ul v-if="result.warnings.length" class="import-result-warnings">
          <li v-for="(w, i) in result.warnings.slice(0, 5)" :key="i">{{ w }}</li>
          <li v-if="result.warnings.length > 5">…还有 {{ result.warnings.length - 5 }} 条警告</li>
        </ul>
        <div class="modal-actions">
          <button class="btn-primary" @click="emit('done')">完成</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useNoteStore } from '../stores/note'
import type { ImportFolderResult, ImportFolderScanResult, PersistedImportFolderOptions } from '../types/import'
import { loadImportFolderOptions, saveImportFolderOptions } from '../utils/importFolderOptions'
import { findRootFolderByName } from '../utils/importFolderHelpers'
import {
  buildImportFileTree,
  collectImportFilePaths,
  countImportFiles,
  flattenImportFileTree,
  getImportTreeCheckState,
  getTopLevelFolderPaths,
  type ImportFileTreeNode,
} from '../utils/importFolderTree'
import { showAppNotification } from '../utils/notify'

const props = defineProps<{
  visible: boolean
  scan: ImportFolderScanResult | null
}>()

const emit = defineEmits<{
  cancel: []
  done: []
}>()

const store = useNoteStore()
const phase = ref<'preview' | 'importing' | 'done'>('preview')
const draft = reactive<PersistedImportFolderOptions>(loadImportFolderOptions())
const targetMode = ref<'active' | 'new'>('active')
const selected = ref<Set<string>>(new Set())
const expandedPaths = ref<Set<string>>(new Set())
const fileTree = ref<ImportFileTreeNode[]>([])
const progress = ref({ current: 0, total: 0, path: '' })
const result = ref<ImportFolderResult | null>(null)

const isDevWithoutImages = computed(() => typeof window.markflow === 'undefined')

const folderLabel = computed(() => {
  if (!props.scan?.rootPath) return ''
  const parts = props.scan.rootPath.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || props.scan.rootPath
})

const selectedCount = computed(() => selected.value.size)
const allSelected = computed(
  () => props.scan != null && props.scan.files.length > 0 && selected.value.size === props.scan.files.length
)
const someSelected = computed(() => selected.value.size > 0)

const progressPercent = computed(() => {
  if (!progress.value.total) return 0
  return Math.round((progress.value.current / progress.value.total) * 100)
})

const canStart = computed(
  () => props.scan != null && props.scan.files.length > 0 && selected.value.size > 0
)

const canClose = computed(() => phase.value !== 'importing')

const visibleRows = computed(() => flattenImportFileTree(fileTree.value, expandedPaths.value))

watch(
  () => [props.visible, props.scan] as const,
  ([open, scan]) => {
    if (!open || !scan) return
    phase.value = 'preview'
    result.value = null
    Object.assign(draft, loadImportFolderOptions())
    selected.value = new Set(scan.files.map((f) => f.relativePath))
    fileTree.value = buildImportFileTree(scan.files)
    expandedPaths.value = new Set(getTopLevelFolderPaths(fileTree.value))
    targetMode.value = store.activeFolderId ? 'active' : 'new'
  }
)

function folderCheckState(node: ImportFileTreeNode) {
  return getImportTreeCheckState(node, selected.value)
}

function countFiles(node: ImportFileTreeNode) {
  return countImportFiles(node)
}

function toggleExpand(path: string) {
  const next = new Set(expandedPaths.value)
  if (next.has(path)) next.delete(path)
  else next.add(path)
  expandedPaths.value = next
}

function onRowClick(node: ImportFileTreeNode) {
  if (node.kind === 'folder') toggleExpand(node.path)
}

function toggleNode(node: ImportFileTreeNode, e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  const paths = collectImportFilePaths(node)
  const next = new Set(selected.value)
  for (const path of paths) {
    if (checked) next.add(path)
    else next.delete(path)
  }
  selected.value = next
}

function toggleSelectAll(e: Event) {
  if (!props.scan) return
  const checked = (e.target as HTMLInputElement).checked
  selected.value = checked
    ? new Set(props.scan.files.map((f) => f.relativePath))
    : new Set()
}

async function startImport() {
  if (!props.scan || !canStart.value) return

  if (draft.replaceExisting) {
    const ok = confirm('将清空全部现有笔记、文件夹与图片后再导入，确定继续？')
    if (!ok) return
  }

  saveImportFolderOptions({ ...draft })
  phase.value = 'importing'
  progress.value = { current: 0, total: selected.value.size, path: '' }

  let targetFolderId: string | undefined
  if (!draft.preserveStructure && !draft.replaceExisting) {
    if (targetMode.value === 'active') {
      targetFolderId = store.activeFolderId ?? undefined
    } else {
      const name = folderLabel.value || '导入'
      const existing = findRootFolderByName(store.folderList, name)
      targetFolderId = existing?.id ?? store.createFolder(name).id
    }
  }

  try {
    result.value = await store.batchImportFromFolder(
      props.scan,
      {
        preserveStructure: draft.preserveStructure,
        targetFolderId,
        onConflict: draft.onConflict,
        importImages: draft.importImages,
        replaceExisting: draft.replaceExisting,
        selectedPaths: selected.value,
      },
      (p) => {
        progress.value = p
      }
    )
    phase.value = 'done'
    if (result.value.imported > 0) {
      showAppNotification(`已导入 ${result.value.imported} 篇笔记`)
    }
  } catch (err) {
    phase.value = 'preview'
    const msg = err instanceof Error ? err.message : String(err)
    showAppNotification('导入失败：' + msg)
  }
}
</script>

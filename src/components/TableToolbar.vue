<template>
  <div
    v-if="visible"
    class="table-toolbar"
    data-testid="table-toolbar"
    :style="toolbarStyle"
  >
    <span v-if="context" class="table-toolbar-status" data-testid="table-toolbar-status">
      第{{ context.rowIndex + 1 }}行 / 第{{ context.colIndex + 1 }}列
    </span>
    <button type="button" data-testid="table-add-row-before" @click="emit('addRowBefore')">上方插行</button>
    <button type="button" data-testid="table-add-row-after" @click="emit('addRowAfter')">下方插行</button>
    <button type="button" data-testid="table-add-col-before" @click="emit('addColBefore')">左侧插列</button>
    <button type="button" data-testid="table-add-col-after" @click="emit('addColAfter')">右侧插列</button>
    <button type="button" data-testid="table-align-left" @click="emit('setColAlign', 'left')">左对齐</button>
    <button type="button" data-testid="table-align-center" @click="emit('setColAlign', 'center')">居中</button>
    <button type="button" data-testid="table-align-right" @click="emit('setColAlign', 'right')">右对齐</button>
    <button
      type="button"
      data-testid="table-delete-row"
      :title="deleteRowTitle"
      :aria-label="deleteRowTitle"
      :disabled="!context?.canDeleteRow"
      @click="emit('deleteRow')"
    >
      删除当前行
    </button>
    <button
      type="button"
      data-testid="table-delete-col"
      :title="deleteColTitle"
      :aria-label="deleteColTitle"
      :disabled="!context?.canDeleteCol"
      @click="emit('deleteCol')"
    >
      删除当前列
    </button>
    <button
      type="button"
      data-testid="table-delete-table"
      class="danger"
      title="删除整个表格"
      aria-label="删除整个表格"
      @click="emit('deleteTable')"
    >
      删除表格
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TableToolbarContext, TableToolbarPosition } from '../composables/useTableToolbar'

const props = defineProps<{
  visible: boolean
  position: TableToolbarPosition
  context: TableToolbarContext | null
}>()

const emit = defineEmits<{
  addRowBefore: []
  addRowAfter: []
  addColBefore: []
  addColAfter: []
  setColAlign: [alignment: 'left' | 'center' | 'right']
  deleteRow: []
  deleteCol: []
  deleteTable: []
}>()

const toolbarStyle = computed(() => ({
  top: `${props.position.top}px`,
  left: `${props.position.left}px`,
  width: `${props.position.width}px`,
}))

const deleteRowTitle = computed(() =>
  props.context?.canDeleteRow
    ? `删除当前行（第 ${props.context.rowIndex + 1} 行，共 ${props.context.rowCount} 行）`
    : '至少保留一行；如需移除整张表，请使用“删除表格”'
)

const deleteColTitle = computed(() =>
  props.context?.canDeleteCol
    ? `删除当前列（第 ${props.context.colIndex + 1} 列，共 ${props.context.colCount} 列）`
    : '至少保留一列；如需移除整张表，请使用“删除表格”'
)
</script>

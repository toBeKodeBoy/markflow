<template>
  <div
    v-if="visible"
    class="table-toolbar"
    data-testid="table-toolbar"
    :style="{ top: position.top + 'px', left: position.left + 'px' }"
  >
    <button type="button" data-testid="table-add-row" title="在下方插入行" aria-label="在下方插入行" @click="$emit('addRowAfter')">+行</button>
    <button type="button" data-testid="table-add-col" title="在右侧插入列" aria-label="在右侧插入列" @click="$emit('addColAfter')">+列</button>
    <span class="sep" aria-hidden="true">|</span>
    <button type="button" data-testid="table-delete-row" title="删除当前行" aria-label="删除当前行" @click="$emit('deleteRow')">-行</button>
    <button type="button" data-testid="table-delete-col" title="删除当前列" aria-label="删除当前列" @click="$emit('deleteCol')">-列</button>
    <button type="button" data-testid="table-delete-table" title="删除整个表格" aria-label="删除整个表格" @click="$emit('deleteTable')">删除表格</button>
    <span class="sep" aria-hidden="true">|</span>
    <button type="button" data-testid="table-align-left" title="左对齐" aria-label="左对齐" @click="$emit('setColAlign', 'left')">≡←</button>
    <button type="button" data-testid="table-align-center" title="居中对齐" aria-label="居中对齐" @click="$emit('setColAlign', 'center')">≡↔</button>
    <button type="button" data-testid="table-align-right" title="右对齐" aria-label="右对齐" @click="$emit('setColAlign', 'right')">≡→</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean; position: { top: number; left: number } }>()
defineEmits<{
  addRowAfter: []
  addColAfter: []
  deleteRow: []
  deleteCol: []
  deleteTable: []
  setColAlign: [alignment: 'left' | 'center' | 'right']
}>()
</script>

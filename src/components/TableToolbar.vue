<template>
  <div v-if="visible" class="table-toolbar" data-testid="table-toolbar">
    <button type="button" data-testid="table-add-row" title="在下方插入行" aria-label="在下方插入行" @click="$emit('addRowAfter')">+行</button>
    <button type="button" data-testid="table-add-col" title="在右侧插入列" aria-label="在右侧插入列" @click="$emit('addColAfter')">+列</button>
    <span class="sep" aria-hidden="true">|</span>
    <button type="button" data-testid="table-delete-row" title="删除当前行" aria-label="删除当前行" @click="$emit('deleteRow')">-行</button>
    <button type="button" data-testid="table-delete-col" title="删除当前列" aria-label="删除当前列" @click="$emit('deleteCol')">-列</button>
    <button type="button" data-testid="table-delete-table" title="删除整个表格" aria-label="删除整个表格" @click="$emit('deleteTable')">删除表格</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean }>()
defineEmits<{
  addRowAfter: []
  addColAfter: []
  deleteRow: []
  deleteCol: []
  deleteTable: []
}>()
</script>

<template>
  <div class="search-empty-state">
    <p class="search-empty-title">未找到匹配笔记</p>
    <p v-if="query" class="search-empty-query">关键词：「{{ query }}」</p>
    <button type="button" class="search-empty-clear" @click="$emit('clear')">清除搜索</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ query: string }>()
defineEmits<{ clear: [] }>()
</script>

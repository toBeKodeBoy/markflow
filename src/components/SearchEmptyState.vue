<template>
  <div class="search-empty-state">
    <div class="search-empty-icon-wrap">
      <AppIcon name="search" :size="22" class="search-empty-icon" />
    </div>
    <p class="search-empty-title">未找到匹配笔记</p>
    <p class="search-empty-desc">
      没有包含
      <span class="search-empty-query">「{{ query }}」</span>
      的笔记
    </p>
    <p v-if="activeTagFilter" class="search-empty-tag-hint">
      当前标签筛选：<span class="search-empty-query">#{{ activeTagFilter }}</span>
    </p>
    <p class="search-empty-tip">试试更短的关键词，或清除标签筛选</p>
    <button type="button" class="search-empty-action" @click="$emit('clear')">清除搜索</button>
  </div>
</template>

<script setup lang="ts">
import AppIcon from './AppIcon.vue'

defineProps<{
  query: string
  activeTagFilter?: string | null
}>()

defineEmits<{ clear: [] }>()
</script>

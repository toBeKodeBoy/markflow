<template>
  <div class="workspace-mode-bar" data-testid="workspace-mode-bar">
    <div class="view-mode-switcher" role="group" aria-label="编辑模式">
      <button
        type="button"
        :class="{ active: viewMode === 'live' }"
        title="纯文档预览"
        @click="$emit('setViewMode', 'live')"
      >
        预览
      </button>
      <button
        type="button"
        :class="{ active: viewMode === 'split' }"
        title="分屏编辑"
        @click="$emit('setViewMode', 'split')"
      >
        分屏
      </button>
      <button
        type="button"
        :class="{ active: viewMode === 'source' }"
        title="源代码模式"
        @click="$emit('setViewMode', 'source')"
      >
        源码
      </button>
      <button
        type="button"
        :class="{ active: viewMode === 'focus' }"
        title="专注模式"
        @click="$emit('setViewMode', 'focus')"
      >
        专注
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ViewMode } from '../types'

defineProps<{ viewMode: ViewMode }>()
defineEmits<{ setViewMode: [mode: ViewMode] }>()
</script>

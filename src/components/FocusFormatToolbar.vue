<template>
  <div
    class="focus-format-toolbar"
    :class="{ 'is-hidden': !visible }"
    data-testid="focus-format-toolbar"
    @mouseenter="$emit('mouseenter')"
    @mouseleave="$emit('mouseleave')"
  >
    <button
      type="button"
      data-testid="focus-toolbar-bold"
      title="粗体 (Ctrl+B)"
      aria-label="粗体"
      @click="$emit('bold')"
    >
      <b>B</b>
    </button>
    <button
      type="button"
      data-testid="focus-toolbar-italic"
      title="斜体 (Ctrl+I)"
      aria-label="斜体"
      @click="$emit('italic')"
    >
      <i>I</i>
    </button>
    <span class="sep" aria-hidden="true">|</span>
    <button
      type="button"
      data-testid="focus-toolbar-h1"
      title="标题 1"
      aria-label="标题 1"
      @click="$emit('h1')"
    >
      H1
    </button>
    <button
      type="button"
      data-testid="focus-toolbar-h2"
      title="标题 2"
      aria-label="标题 2"
      @click="$emit('h2')"
    >
      H2
    </button>
    <span class="sep" aria-hidden="true">|</span>
    <button
      type="button"
      data-testid="focus-toolbar-bullet-list"
      title="无序列表"
      aria-label="无序列表"
      @click="$emit('bulletList')"
    >
      ≡
    </button>
    <button
      type="button"
      data-testid="focus-toolbar-ordered-list"
      title="有序列表"
      aria-label="有序列表"
      @click="$emit('orderedList')"
    >
      1.
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean }>()
defineEmits<{
  bold: []
  italic: []
  h1: []
  h2: []
  bulletList: []
  orderedList: []
  mouseenter: []
  mouseleave: []
}>()
</script>

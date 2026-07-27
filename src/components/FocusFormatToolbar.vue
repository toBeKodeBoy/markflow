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
    <button
      type="button"
      data-testid="focus-toolbar-highlight"
      title="高亮显示"
      aria-label="高亮显示"
      @click="$emit('highlight')"
    >
      高亮
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
    <span class="sep" aria-hidden="true">|</span>
    <button
      type="button"
      data-testid="focus-toolbar-image-button"
      title="上传图片"
      aria-label="上传图片"
      @click="triggerImageUpload"
    >
      📷
    </button>
    <input
      ref="imageInputRef"
      data-testid="focus-toolbar-image-input"
      type="file"
      accept="image/*"
      class="settings-hidden-input"
      @change="onImageFileChange"
    >
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ visible: boolean }>()

const emit = defineEmits<{
  bold: []
  italic: []
  highlight: []
  h1: []
  h2: []
  bulletList: []
  orderedList: []
  imageUpload: [file: File]
  mouseenter: []
  mouseleave: []
}>()

const imageInputRef = ref<HTMLInputElement>()

function triggerImageUpload() {
  imageInputRef.value?.click()
}

function onImageFileChange(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (file) emit('imageUpload', file)
  if (input) input.value = ''
}
</script>

<template>
  <div class="editor-toolbar" data-testid="format-toolbar">
    <div class="toolbar-group" data-testid="toolbar-group" data-group="text">
      <span class="toolbar-group-label" data-testid="toolbar-group-text">文字</span>
      <button type="button" title="粗体 (Ctrl+B)" aria-label="粗体" @click="$emit('bold')"><b>B</b></button>
      <button type="button" title="斜体 (Ctrl+I)" aria-label="斜体" @click="$emit('italic')"><i>I</i></button>
      <button type="button" title="删除线" aria-label="删除线" @click="$emit('strike')"><s>S</s></button>
      <button type="button" title="下划线 (Ctrl+U)" aria-label="下划线" @click="$emit('underline')"><u>U</u></button>
      <button
        type="button"
        data-testid="toolbar-highlight"
        title="高亮显示"
        aria-label="高亮显示"
        @click="$emit('highlight')"
      >
        高亮
      </button>
    </div>

    <span class="sep" aria-hidden="true">|</span>

    <div class="toolbar-group" data-testid="toolbar-group" data-group="heading">
      <span class="toolbar-group-label" data-testid="toolbar-group-heading">标题</span>
      <button type="button" title="标题 1" aria-label="标题 1" @click="$emit('h1')">H1</button>
      <button type="button" title="标题 2" aria-label="标题 2" @click="$emit('h2')">H2</button>
      <button type="button" title="标题 3" aria-label="标题 3" @click="$emit('h3')">H3</button>
    </div>

    <span class="sep" aria-hidden="true">|</span>

    <div class="toolbar-group" data-testid="toolbar-group" data-group="list">
      <span class="toolbar-group-label" data-testid="toolbar-group-list">列表</span>
      <button type="button" title="无序列表" aria-label="无序列表" @click="$emit('bulletList')">≡</button>
      <button type="button" title="有序列表" aria-label="有序列表" @click="$emit('orderedList')">1.</button>
      <button
        v-if="showTaskListButton"
        type="button"
        data-testid="toolbar-task-list"
        title="任务列表"
        aria-label="任务列表"
        @click="$emit('taskList')"
      >
        [x]
      </button>
      <button type="button" title="引用块" aria-label="引用块" @click="$emit('blockquote')">❝</button>
    </div>

    <span class="sep" aria-hidden="true">|</span>

    <div class="toolbar-group" data-testid="toolbar-group" data-group="insert">
      <span class="toolbar-group-label" data-testid="toolbar-group-insert">插入</span>
      <button type="button" title="行内代码 (Ctrl/Cmd+E)" aria-label="行内代码" @click="$emit('inlineCode')">`</button>
      <button type="button" title="代码块" aria-label="代码块" @click="$emit('codeBlock')">&lt;/&gt;</button>
      <button
        type="button"
        data-testid="toolbar-table"
        title="插入表格"
        aria-label="插入表格"
        @click="$emit('table')"
      >
        ⊞
      </button>
      <button type="button" title="插入链接" aria-label="插入链接" @click="$emit('link')">🔗</button>
      <button
        type="button"
        data-testid="toolbar-image-button"
        title="上传图片"
        aria-label="上传图片"
        @click="triggerImageUpload"
      >
        📷
      </button>
      <input
        ref="imageInputRef"
        data-testid="toolbar-image-input"
        type="file"
        accept="image/*"
        class="settings-hidden-input"
        @change="onImageFileChange"
      >
    </div>

    <span class="sep" aria-hidden="true">|</span>
    <span v-if="charCount !== undefined" class="char-count">{{ charCount }} 字</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

withDefaults(defineProps<{ charCount?: number; showTaskListButton?: boolean }>(), {
  showTaskListButton: true,
})

const emit = defineEmits<{
  bold: []
  italic: []
  strike: []
  underline: []
  highlight: []
  h1: []
  h2: []
  h3: []
  bulletList: []
  orderedList: []
  taskList: []
  blockquote: []
  inlineCode: []
  codeBlock: []
  table: []
  link: []
  imageUpload: [file: File]
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

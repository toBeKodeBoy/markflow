<template>
  <div class="editor-toolbar">
    <button type="button" @click="$emit('bold')" title="粗体 (Ctrl+B)" aria-label="粗体"><b>B</b></button>
    <button type="button" @click="$emit('italic')" title="斜体 (Ctrl+I)" aria-label="斜体"><i>I</i></button>
    <button type="button" @click="$emit('strike')" title="删除线" aria-label="删除线"><s>S</s></button>
    <button type="button" @click="$emit('underline')" title="下划线 (Ctrl+U)" aria-label="下划线"><u>U</u></button>
    <span class="sep" aria-hidden="true">|</span>
    <button type="button" @click="$emit('h1')" title="标题 1" aria-label="标题 1">H1</button>
    <button type="button" @click="$emit('h2')" title="标题 2" aria-label="标题 2">H2</button>
    <button type="button" @click="$emit('h3')" title="标题 3" aria-label="标题 3">H3</button>
    <span class="sep" aria-hidden="true">|</span>
    <button type="button" @click="$emit('bulletList')" title="无序列表" aria-label="无序列表">≡</button>
    <button type="button" @click="$emit('orderedList')" title="有序列表" aria-label="有序列表">1.</button>
    <button type="button" @click="$emit('blockquote')" title="引用块" aria-label="引用块">❝</button>
    <span class="sep" aria-hidden="true">|</span>
    <button type="button" @click="$emit('inlineCode')" title="行内代码 (Ctrl/Cmd+E)" aria-label="行内代码">`</button>
    <button type="button" @click="$emit('codeBlock')" title="代码块" aria-label="代码块">&lt;/&gt;</button>
    <button type="button" @click="$emit('table')" title="插入表格" aria-label="插入表格">⊞</button>
    <button type="button" @click="$emit('link')" title="插入链接" aria-label="插入链接">🔗</button>
    <span class="sep" aria-hidden="true">|</span>
    <span v-if="charCount !== undefined" class="char-count">{{ charCount }} 字</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ charCount?: number }>()
defineEmits<{
  bold: []
  italic: []
  strike: []
  underline: []
  h1: []
  h2: []
  h3: []
  bulletList: []
  orderedList: []
  blockquote: []
  inlineCode: []
  codeBlock: []
  table: []
  link: []
}>()
</script>

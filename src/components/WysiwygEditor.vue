<template>
  <div class="editor-pane wysiwyg-pane">
    <div ref="containerRef" :class="['milkdown-host', { 'milkdown-dark': isDark }]"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { clipboard } from '@milkdown/plugin-clipboard'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { history } from '@milkdown/plugin-history'
import { getMarkdown, replaceAll } from '@milkdown/utils'
import { useNoteStore } from '../stores/note'
import { useTocJumpHandler } from '../composables/useTocJumpHandler'
import { markdownPaste } from '../plugins/markdownPaste'

const store = useNoteStore()
const containerRef = ref<HTMLDivElement>()
let editor: Editor | null = null

const isDark = computed(() => document.documentElement.getAttribute('data-theme') === 'dark')

let saveTimer: ReturnType<typeof setTimeout> | null = null
let initing: Promise<void> | null = null

/** 初始化 Milkdown WYSIWYG 编辑器（含 commonmark/GFM/clipboard/listener/history 插件），支持销毁重建 */
async function initEditor(content: string) {
  if (initing) await initing
  initing = (async () => {
    if (editor) {
      await editor.destroy()
      editor = null
    }
    if (containerRef.value) containerRef.value.innerHTML = ''
    if (!containerRef.value) return

    editor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, containerRef.value!)
        ctx.set(defaultValueCtx, content)
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          store.setLiveContent(markdown)
          if (saveTimer) clearTimeout(saveTimer)
          saveTimer = setTimeout(() => {
            store.updateCurrentContent(markdown)
          }, 300)
        })
      })
      .use(commonmark)
      .use(gfm)
      .use(clipboard)
      .use(markdownPaste)
      .use(listener)
      .use(history)
      .create()
  })()
  await initing
  initing = null
}

watch(
  () => store.currentNote?.id,
  () => {
    if (!editor) return
    const content = store.currentNote?.content ?? ''
    store.setLiveContent(content)
    editor.action((ctx) => {
      if (getMarkdown()(ctx) === content) return
      replaceAll(content)(ctx)
    })
  }
)

watch(isDark, async () => {
  await initEditor(store.liveContent || (store.currentNote?.content ?? ''))
})

useTocJumpHandler(containerRef, store)

onMounted(() => {
  const content = store.currentNote?.content ?? store.liveContent ?? ''
  initEditor(content)
})

onBeforeUnmount(async () => {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (editor) {
    editor.action((ctx) => {
      const markdown = getMarkdown()(ctx)
      store.setLiveContent(markdown)
      store.updateCurrentContent(markdown)
    })
    await editor.destroy()
    editor = null
  }
})
</script>

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
import { listItemBlockComponent } from '@milkdown/components/list-item-block'
import { getMarkdown, replaceAll } from '@milkdown/utils'
import { useNoteStore } from '../stores/note'
import { useTocJumpHandler } from '../composables/useTocJumpHandler'
import { markdownPaste } from '../plugins/markdownPaste'
import { highlightMarkPlugins } from '../plugins/highlightMark'
import { underlineMarkPlugins } from '../plugins/underlineMark'
import { normalizeUnderlineMarkdown } from '../utils/markedSetup'

const store = useNoteStore()
const containerRef = ref<HTMLDivElement>()
let editor: Editor | null = null

const isDark = computed(() => document.documentElement.getAttribute('data-theme') === 'dark')

let saveTimer: ReturnType<typeof setTimeout> | null = null
let initing: Promise<void> | null = null
/** 编辑器未就绪时暂存待切换的内容，初始化后自动应用 */
let pendingContent: string | null = null

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
        ctx.set(defaultValueCtx, normalizeUnderlineMarkdown(content))
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
      .use(listItemBlockComponent)
      .use(highlightMarkPlugins)
      .use(underlineMarkPlugins)
      .use(clipboard)
      .use(markdownPaste)
      .use(listener)
      .use(history)
      .create()

    // 初始化完成后，应用初始化期间暂存的待切换内容
    if (pendingContent !== null) {
      const pc = pendingContent
      pendingContent = null
      editor.action((ctx) => {
        if (getMarkdown()(ctx) === pc) return
        replaceAll(normalizeUnderlineMarkdown(pc))(ctx)
      })
    }
  })()
  await initing
  initing = null
}

watch(
  () => store.currentNote?.id,
  () => {
    const content = store.currentNote?.content ?? ''
    store.setLiveContent(content)
    if (!editor) {
      pendingContent = content
      return
    }
    editor.action((ctx) => {
      if (getMarkdown()(ctx) === content) return
      replaceAll(normalizeUnderlineMarkdown(content))(ctx)
    })
  }
)

watch(isDark, (dark) => {
  if (containerRef.value) {
    containerRef.value.classList.toggle('milkdown-dark', dark)
  }
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

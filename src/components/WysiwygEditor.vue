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
import { editorViewOptionsCtx } from '@milkdown/core'
import { useNoteStore } from '../stores/note'
import { useTocJumpHandler } from '../composables/useTocJumpHandler'
import { markdownPaste } from '../plugins/markdownPaste'
import { imagePaste } from '../plugins/imagePaste'
import { plainTextFallback } from '../plugins/plainTextFallback'
import { highlightMarkPlugins } from '../plugins/highlightMark'
import { underlineMarkPlugins } from '../plugins/underlineMark'
import { codeBlockLabelPlugin, codeBlockExitPlugin } from '../plugins/codeBlockLabel'
import { autoCloseBracketsPlugin } from '../plugins/autoCloseBrackets'
import { normalizeUnderlineMarkdown } from '../utils/markedSetup'
import {
  handleCodeCopyCaptureClick,
  handleCodeCopyCaptureMouseDown,
} from '../utils/codeCopy'
import { resolveMarkdownForDisplay, persistMarkdownAssets } from '../utils/resolveMarkdownAssets'

/** 粘贴 HTML 清洗：剥离 ProseMirror schema 不兼容的元素，防止 replaceSelection 异常触发静默粘贴失败 */
function sanitizePastedHTML(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const body = doc.body

  const removeTags = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'CANVAS', 'VIDEO', 'AUDIO', 'OBJECT', 'EMBED', 'APPLET'])
  const unwrapTags = new Set(['DIV', 'SPAN', 'SECTION', 'ARTICLE', 'ASIDE', 'NAV', 'HEADER', 'FOOTER', 'MAIN', 'FIGURE', 'FIGCAPTION', 'DETAILS', 'SUMMARY', 'ADDRESS', 'DATA', 'TIME', 'ABBR', 'BDO', 'BDI', 'RUBY', 'RT', 'RP', 'WBR'])

  const toProcess: Element[] = []
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_ELEMENT)
  while (walker.nextNode()) {
    toProcess.push(walker.currentNode as Element)
  }

  for (const el of toProcess.reverse()) {
    if (removeTags.has(el.tagName)) {
      el.remove()
    } else if (unwrapTags.has(el.tagName)) {
      el.replaceWith(...Array.from(el.childNodes))
    }
  }

  return body.innerHTML
}

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

    const displayContent = await resolveMarkdownForDisplay(normalizeUnderlineMarkdown(content))

    editor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, containerRef.value!)
        ctx.set(defaultValueCtx, displayContent)
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          void persistMarkdownAssets(markdown).then((persisted) => {
            store.setLiveContent(persisted)
            if (saveTimer) clearTimeout(saveTimer)
            saveTimer = setTimeout(() => {
              store.updateCurrentContent(persisted)
            }, 300)
          })
        })
        ctx.update(editorViewOptionsCtx, (prev) => ({
          ...prev,
          transformPastedHTML: (html: string) => {
            if (prev.transformPastedHTML) html = (prev.transformPastedHTML as (html: string) => string)(html)
            return sanitizePastedHTML(html)
          },
        }))
      })
      .use(codeBlockExitPlugin)
      .use(commonmark)
      .use(gfm)
      .use(highlightMarkPlugins)
      .use(underlineMarkPlugins)
      .use(imagePaste)
      .use(markdownPaste)
      .use(clipboard)
      .use(plainTextFallback)
      .use(codeBlockLabelPlugin)
      .use(autoCloseBracketsPlugin)
      .use(listener)
      .use(history)
      .create()

    // 初始化完成后，应用初始化期间暂存的待切换内容
    if (pendingContent !== null) {
      const pc = pendingContent
      pendingContent = null
      const displayPc = await resolveMarkdownForDisplay(normalizeUnderlineMarkdown(pc))
      editor.action((ctx) => {
        if (getMarkdown()(ctx) === displayPc) return
        replaceAll(displayPc)(ctx)
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
    void resolveMarkdownForDisplay(normalizeUnderlineMarkdown(content)).then((displayContent) => {
      if (!editor) return
      editor.action((ctx) => {
        if (getMarkdown()(ctx) === displayContent) return
        replaceAll(displayContent)(ctx)
      })
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
  const host = containerRef.value
  if (host) {
    host.addEventListener('mousedown', handleCodeCopyCaptureMouseDown, true)
    host.addEventListener('click', handleCodeCopyCaptureClick, true)
  }
})

onBeforeUnmount(async () => {
  const host = containerRef.value
  if (host) {
    host.removeEventListener('mousedown', handleCodeCopyCaptureMouseDown, true)
    host.removeEventListener('click', handleCodeCopyCaptureClick, true)
  }
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (editor) {
    const markdown = await new Promise<string>((resolve) => {
      editor!.action((ctx) => resolve(getMarkdown()(ctx)))
    })
    const persisted = await persistMarkdownAssets(markdown)
    store.setLiveContent(persisted)
    store.updateCurrentContent(persisted)
    await editor.destroy()
    editor = null
  }
})
</script>

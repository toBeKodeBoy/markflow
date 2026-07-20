<template>
  <div class="editor-pane wysiwyg-pane">
    <FormatToolbar
      v-if="!focusMode"
      :char-count="charCount"
      @bold="onToolbarBold"
      @italic="onToolbarItalic"
      @strike="onToolbarStrike"
      @underline="onToolbarUnderline"
      @h1="onToolbarH1"
      @h2="onToolbarH2"
      @h3="onToolbarH3"
      @bullet-list="onToolbarBulletList"
      @ordered-list="onToolbarOrderedList"
      @blockquote="onToolbarBlockquote"
      @inline-code="onToolbarInlineCode"
      @code-block="onToolbarCodeBlock"
      @table="onToolbarTable"
      @link="onToolbarLink"
    />
    <NoteTagsBar v-if="!focusMode && isActive" />
    <div class="wysiwyg-body">
      <div ref="containerRef" :class="['milkdown-host', { 'milkdown-dark': isDark }]"></div>
      <TableToolbar
        v-if="!focusMode"
        :visible="isInTable"
        :position="toolbarPosition"
        :context="tableContext"
        @add-row-before="onTableAddRowBefore"
        @add-row-after="onTableAddRowAfter"
        @add-col-before="onTableAddColBefore"
        @add-col-after="onTableAddColAfter"
        @set-col-align="onTableSetColAlign"
        @delete-row="onTableDeleteRow"
        @delete-col="onTableDeleteCol"
        @delete-table="onTableDeleteTable"
      />
    </div>
    <FocusFormatToolbar
      v-if="focusMode"
      :visible="focusToolbarVisible"
      @mouseenter="onFocusToolbarEnter"
      @mouseleave="onFocusToolbarLeave"
      @bold="onToolbarBold"
      @italic="onToolbarItalic"
      @h1="onToolbarH1"
      @h2="onToolbarH2"
      @bullet-list="onToolbarBulletList"
      @ordered-list="onToolbarOrderedList"
    />
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
import { useEditorTabsStore } from '../stores/editorTabs'
import { useTocJumpHandler } from '../composables/useTocJumpHandler'
import { markdownPaste } from '../plugins/markdownPaste'
import { imagePaste } from '../plugins/imagePaste'
import { imageScalePlugin } from '../plugins/imageScale'
import { plainTextFallback } from '../plugins/plainTextFallback'
import { highlightMarkPlugins } from '../plugins/highlightMark'
import { mathPlugins } from '../plugins/math'
import { underlineMarkPlugins } from '../plugins/underlineMark'
import { htmlRenderPlugins } from '../plugins/htmlRender'
import { codeBlockLabelPlugin, codeBlockExitPlugin } from '../plugins/codeBlockLabel'
import { headingIdPlugins } from '../plugins/headingId'
import { autoCloseBracketsPlugin } from '../plugins/autoCloseBrackets'
import { normalizeMarkdownForParse } from '../utils/markedSetup'
import {
  handleCodeCopyCaptureClick,
  handleCodeCopyCaptureMouseDown,
} from '../utils/codeCopy'
import { handleImageLightboxDblClick } from '../utils/imageLightbox'
import { handlePreviewFragmentClick } from '../utils/previewFragmentNav'
import { resolveMarkdownForDisplay, persistMarkdownAssets } from '../utils/resolveMarkdownAssets'
import FormatToolbar from './FormatToolbar.vue'
import FocusFormatToolbar from './FocusFormatToolbar.vue'
import TableToolbar from './TableToolbar.vue'
import NoteTagsBar from './NoteTagsBar.vue'
import { useFocusToolbarVisibility } from '../composables/useFocusToolbarVisibility'
import { useTableToolbar } from '../composables/useTableToolbar'
import {
  wysiwygToggleBold,
  wysiwygToggleItalic,
  wysiwygToggleStrike,
  wysiwygToggleUnderline,
  wysiwygToggleInlineCode,
  wysiwygSetHeading,
  wysiwygWrapBlockquote,
  wysiwygWrapBulletList,
  wysiwygWrapOrderedList,
  wysiwygInsertCodeBlock,
  wysiwygInsertTable,
  wysiwygInsertLink,
  wysiwygAddRowBefore,
  wysiwygAddRowAfter,
  wysiwygAddColBefore,
  wysiwygAddColAfter,
  wysiwygSetColAlign,
  wysiwygDeleteRow,
  wysiwygDeleteCol,
  wysiwygDeleteTable,
} from '../utils/wysiwygFormat'

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

const props = defineProps<{ noteId: string; focusMode?: boolean }>()

const store = useNoteStore()
const tabsStore = useEditorTabsStore()
const containerRef = ref<HTMLDivElement>()
let editor: Editor | null = null

const isActive = computed(() => tabsStore.activeTabId === props.noteId)

const charCount = computed(() => {
  const tab = tabsStore.tabs.find((t) => t.noteId === props.noteId)
  return tab?.liveContent.length ?? 0
})

const focusModeEnabled = computed(() => props.focusMode === true)
const { visible: focusToolbarVisible, onToolbarEnter: onFocusToolbarEnter, onToolbarLeave: onFocusToolbarLeave } =
  useFocusToolbarVisibility(focusModeEnabled)

const {
  isInTable,
  tableContext,
  toolbarPosition,
  check: checkTableToolbar,
  attach: attachTableToolbar,
  detach: detachTableToolbar,
} =
  useTableToolbar(() => editor)

function onToolbarBold() { wysiwygToggleBold(editor) }
function onToolbarItalic() { wysiwygToggleItalic(editor) }
function onToolbarStrike() { wysiwygToggleStrike(editor) }
function onToolbarUnderline() { wysiwygToggleUnderline(editor) }
function onToolbarH1() { wysiwygSetHeading(editor, 1) }
function onToolbarH2() { wysiwygSetHeading(editor, 2) }
function onToolbarH3() { wysiwygSetHeading(editor, 3) }
function onToolbarBulletList() { wysiwygWrapBulletList(editor) }
function onToolbarOrderedList() { wysiwygWrapOrderedList(editor) }
function onToolbarBlockquote() { wysiwygWrapBlockquote(editor) }
function onToolbarInlineCode() { wysiwygToggleInlineCode(editor) }
function onToolbarCodeBlock() { wysiwygInsertCodeBlock(editor) }
function onToolbarTable() { runTableAction(() => wysiwygInsertTable(editor)) }
function onToolbarLink() { wysiwygInsertLink(editor) }
function runTableAction(action: () => void) {
  action()
  checkTableToolbar()
}
function onTableAddRowBefore() { runTableAction(() => wysiwygAddRowBefore(editor)) }
function onTableAddRowAfter() { runTableAction(() => wysiwygAddRowAfter(editor)) }
function onTableAddColBefore() { runTableAction(() => wysiwygAddColBefore(editor)) }
function onTableAddColAfter() { runTableAction(() => wysiwygAddColAfter(editor)) }
function onTableSetColAlign(alignment: 'left' | 'center' | 'right') {
  runTableAction(() => wysiwygSetColAlign(editor, alignment))
}
function onTableDeleteRow() { runTableAction(() => wysiwygDeleteRow(editor)) }
function onTableDeleteCol() { runTableAction(() => wysiwygDeleteCol(editor)) }
function onTableDeleteTable() { runTableAction(() => wysiwygDeleteTable(editor)) }

const isDark = computed(() => document.documentElement.getAttribute('data-theme') === 'dark')

let saveTimer: ReturnType<typeof setTimeout> | null = null
let initing: Promise<void> | null = null
/** 编辑器未就绪时暂存外部写入（如插入目录），初始化后自动应用 */
let pendingEditorPush: string | null = null

/** 将 markdown 写入 WYSIWYG 编辑器 */
async function applyEditorMarkdown(markdown: string) {
  const displayContent = await resolveMarkdownForDisplay(normalizeMarkdownForParse(markdown))
  if (!editor) return
  editor.action((ctx) => {
    if (getMarkdown()(ctx) === displayContent) return
    replaceAll(displayContent)(ctx)
  })
}

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

    const displayContent = await resolveMarkdownForDisplay(normalizeMarkdownForParse(content))

    editor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, containerRef.value!)
        ctx.set(defaultValueCtx, displayContent)
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          void persistMarkdownAssets(markdown).then((persisted) => {
            tabsStore.setTabLiveContent(props.noteId, persisted)
            if (saveTimer) clearTimeout(saveTimer)
            saveTimer = setTimeout(() => {
              store.updateNoteContent(props.noteId, persisted)
              const tab = tabsStore.tabs.find((t) => t.noteId === props.noteId)
              if (tab) tab.savedContent = persisted
            }, 300)
          })
        })
        ctx.update(editorViewOptionsCtx, (prev) => ({
          ...prev,
          attributes: {
            ...(typeof prev.attributes === 'object' ? prev.attributes : {}),
            style: 'white-space: pre-wrap; word-wrap: break-word;',
          },
          transformPastedHTML: (html: string) => {
            if (prev.transformPastedHTML) html = (prev.transformPastedHTML as (html: string) => string)(html)
            return sanitizePastedHTML(html)
          },
        }))
      })
      .use(codeBlockExitPlugin)
      .use(commonmark)
      .use(gfm)
      .use(mathPlugins)
      .use(highlightMarkPlugins)
      .use(underlineMarkPlugins)
      .use(htmlRenderPlugins)
      .use(imagePaste)
      .use(imageScalePlugin)
      .use(markdownPaste)
      .use(clipboard)
      .use(plainTextFallback)
      .use(codeBlockLabelPlugin)
      .use(headingIdPlugins)
      .use(autoCloseBracketsPlugin)
      .use(listener)
      .use(history)
      .create()

    editor.action((ctx) => {
      const md = getMarkdown()(ctx)
      void persistMarkdownAssets(md).then((persisted) => {
        tabsStore.setTabLiveContent(props.noteId, persisted)
      })
    })

    detachTableToolbar()
    attachTableToolbar()

    if (pendingEditorPush !== null) {
      const push = pendingEditorPush
      pendingEditorPush = null
      await applyEditorMarkdown(push)
    }
  })()
  await initing
  initing = null
}

watch(
  () => store.editorContentPush?.id,
  () => {
    if (!isActive.value) return
    const push = store.editorContentPush
    if (!push) return
    if (!editor) {
      pendingEditorPush = push.content
      return
    }
    void applyEditorMarkdown(push.content)
  }
)

watch(isDark, (dark) => {
  if (containerRef.value) {
    containerRef.value.classList.toggle('milkdown-dark', dark)
  }
})

useTocJumpHandler(containerRef, store, () => isActive.value)

/** WYSIWYG 点击：页内锚点跳转 + 代码复制 */
function onWysiwygClick(e: MouseEvent) {
  if (handlePreviewFragmentClick(e, containerRef.value)) return
  handleCodeCopyCaptureClick(e)
}

onMounted(async () => {
  const tab = tabsStore.tabs.find((t) => t.noteId === props.noteId)
  await initEditor(tab?.liveContent ?? '')
  attachTableToolbar()
  const host = containerRef.value
  if (host) {
    host.addEventListener('mousedown', handleCodeCopyCaptureMouseDown, true)
    host.addEventListener('click', onWysiwygClick, true)
    host.addEventListener('dblclick', handleImageLightboxDblClick, true)
  }
})

onBeforeUnmount(async () => {
  detachTableToolbar()
  const host = containerRef.value
  if (host) {
    host.removeEventListener('mousedown', handleCodeCopyCaptureMouseDown, true)
    host.removeEventListener('click', onWysiwygClick, true)
    host.removeEventListener('dblclick', handleImageLightboxDblClick, true)
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
    tabsStore.setTabLiveContent(props.noteId, persisted)
    store.updateNoteContent(props.noteId, persisted)
    const tab = tabsStore.tabs.find((t) => t.noteId === props.noteId)
    if (tab) tab.savedContent = persisted
    await editor.destroy()
    editor = null
  }
})
</script>

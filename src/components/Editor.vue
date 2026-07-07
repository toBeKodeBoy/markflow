<template>
  <div class="editor-pane">
    <FormatToolbar
      :char-count="charCount"
      @bold="insertMarkdown('**', '**', '粗体')"
      @italic="insertMarkdown('*', '*', '斜体')"
      @strike="insertMarkdown('~~', '~~', '删除线')"
      @underline="insertUnderline()"
      @h1="insertLine('# ')"
      @h2="insertLine('## ')"
      @h3="insertLine('### ')"
      @bullet-list="insertLine('- ')"
      @ordered-list="insertLine('1. ')"
      @blockquote="insertLine('> ')"
      @inline-code="insertInlineCode()"
      @code-block="insertCodeBlock()"
      @table="insertTable()"
      @link="insertMarkdown('[', '](url)', '链接文字')"
    />
    <NoteTagsBar v-if="isActive" />
    <div ref="editorEl" class="cm-host"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view'
import { EditorState, Compartment, Prec } from '@codemirror/state'
import { closeBracketsKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { oneDark } from '@codemirror/theme-one-dark'
import { autoCloseBracketsExtensions } from '../extensions/autoCloseBrackets'
import { buildInlineCodeInsert } from '../utils/inlineCode'
import { getImageFileFromDataTransfer, handleImageInsert } from '../utils/imageInsert'
import { useNoteStore } from '../stores/note'
import { useEditorTabsStore } from '../stores/editorTabs'
import { useScrollSync } from '../composables/useScrollSync'
import FormatToolbar from './FormatToolbar.vue'
import NoteTagsBar from './NoteTagsBar.vue'

const props = defineProps<{ noteId: string }>()

const store = useNoteStore()
const tabsStore = useEditorTabsStore()
const { setRatio } = useScrollSync()
const editorEl = ref<HTMLElement>()
let view: EditorView | null = null

const isActive = computed(() => tabsStore.activeTabId === props.noteId)

const isDark = computed(() => document.documentElement.getAttribute('data-theme') === 'dark')

const charCount = computed(() => {
  const tab = tabsStore.tabs.find((t) => t.noteId === props.noteId)
  return tab?.liveContent.length ?? 0
})

let updateTimer: ReturnType<typeof setTimeout> | null = null
/** 编辑器未就绪时暂存外部写入（如插入目录），初始化后自动应用 */
let pendingEditorPush: string | null = null

function applyEditorPush(content: string) {
  if (!view) return
  if (view.state.doc.toString() === content) return
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: content },
  })
}
/** 主题切换 Compartment：动态更新 oneDark 扩展，无需重建编辑器实例 */
const themeCompartment = new Compartment()

/** 构建 CodeMirror 扩展集合（历史/行号/高亮/Markdown/快捷键/主题） */
function buildExtensions() {
  const exts = [
    history(),
    lineNumbers(),
    highlightActiveLine(),
    drawSelection(),
    ...autoCloseBracketsExtensions,
    Prec.highest(
      keymap.of([
        { key: 'Mod-u', run: insertUnderline, preventDefault: true },
        { key: 'Mod-e', run: insertInlineCodeCommand, preventDefault: true },
      ]),
    ),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...historyKeymap,
      indentWithTab,
    ]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const content = update.state.doc.toString()
        tabsStore.setTabLiveContent(props.noteId, content)
        if (updateTimer) clearTimeout(updateTimer)
        updateTimer = setTimeout(() => {
          store.updateNoteContent(props.noteId, content)
          const tab = tabsStore.tabs.find((t) => t.noteId === props.noteId)
          if (tab) tab.savedContent = content
        }, 300)
      }
    }),
    EditorView.theme({
      '&': { height: '100%', fontSize: 'var(--editor-font-size, 14px)' },
      '.cm-scroller': { fontFamily: 'var(--editor-font-family, var(--font-mono))', overflow: 'auto' },
      '.cm-content': { padding: '16px' },
    })
  ]
  // 使用 Compartment 动态切换主题，避免销毁重建编辑器
  exts.push(themeCompartment.of(isDark.value ? oneDark : []))
  return exts
}

/** 初始化 CodeMirror 编辑器实例，销毁旧实例并绑定滚动监听 */
function initEditor(content: string) {
  if (view) { view.destroy(); view = null }
  scrollerEl?.removeEventListener('scroll', onEditorScroll)
  if (!editorEl.value) return
  const state = EditorState.create({
    doc: content ?? '',
    extensions: buildExtensions()
  })
  view = new EditorView({ state, parent: editorEl.value })
  attachScrollListener()
  if (pendingEditorPush !== null) {
    const push = pendingEditorPush
    pendingEditorPush = null
    applyEditorPush(push)
  }
}

watch(
  () => store.editorContentPush?.id,
  () => {
    if (!isActive.value) return
    const push = store.editorContentPush
    if (!push) return
    if (!view) {
      pendingEditorPush = push.content
      return
    }
    applyEditorPush(push.content)
  }
)

watch(
  () => store.tocJumpTarget?.id,
  () => {
    if (!isActive.value) return
    const target = store.tocJumpTarget
    if (!target || !view) return
    const docLine = target.line + 1
    if (docLine < 1 || docLine > view.state.doc.lines) return
    const line = view.state.doc.line(docLine)
    view.dispatch({
      effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 16 })
    })
  }
)

watch(isDark, () => {
  if (!view) return
  view.dispatch({
    effects: themeCompartment.reconfigure(isDark.value ? oneDark : [])
  })
})

let scrollerEl: HTMLElement | null = null

/** 为 .cm-scroller 绑定滚动同步事件 */
function attachScrollListener() {
  scrollerEl = editorEl.value?.querySelector('.cm-scroller') ?? null
  if (!scrollerEl) return
  scrollerEl.addEventListener('scroll', onEditorScroll)
}

/** 编辑器滚动回调：计算滚动比例并同步到 useScrollSync（仅激活 Tab） */
function onEditorScroll() {
  if (!isActive.value || !scrollerEl) return
  const { scrollTop, scrollHeight, clientHeight } = scrollerEl
  const max = scrollHeight - clientHeight
  setRatio(max > 0 ? scrollTop / max : 0)
}

onMounted(() => {
  const tab = tabsStore.tabs.find((t) => t.noteId === props.noteId)
  initEditor(tab?.liveContent ?? '')
  attachScrollListener()
  const host = editorEl.value
  if (host) {
    host.addEventListener('paste', onPasteImage)
    host.addEventListener('dragover', onDragOverImage)
    host.addEventListener('drop', onDropImage)
  }
})

onBeforeUnmount(() => {
  const host = editorEl.value
  if (host) {
    host.removeEventListener('paste', onPasteImage)
    host.removeEventListener('dragover', onDragOverImage)
    host.removeEventListener('drop', onDropImage)
  }
  if (updateTimer) {
    clearTimeout(updateTimer)
    updateTimer = null
  }
  if (view) {
    const content = view.state.doc.toString()
    tabsStore.setTabLiveContent(props.noteId, content)
    store.updateNoteContent(props.noteId, content)
    const tab = tabsStore.tabs.find((t) => t.noteId === props.noteId)
    if (tab) tab.savedContent = content
  }
  scrollerEl?.removeEventListener('scroll', onEditorScroll)
  view?.destroy()
})

// Toolbar helpers
/** 工具栏：在选中文本前后插入 Markdown 标记（加粗/斜体/链接等） */
function insertMarkdown(before: string, after: string, placeholder: string) {
  if (!view) return
  const sel = view.state.selection.main
  const selected = view.state.sliceDoc(sel.from, sel.to) || placeholder
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: before + selected + after },
    selection: { anchor: sel.from + before.length, head: sel.from + before.length + selected.length }
  })
  view.focus()
}

/** 快捷键：Ctrl+U 插入下划线标签，作为 CodeMirror Command 返回 boolean */
function insertUnderline(): boolean {
  if (!view) return false
  insertMarkdown('<u>', '</u>', '下划线')
  return true
}

/** 工具栏：在当前行首插入前缀（标题/列表/引用等） */
function insertLine(prefix: string) {
  if (!view) return
  const sel = view.state.selection.main
  const line = view.state.doc.lineAt(sel.from)
  view.dispatch({
    changes: { from: line.from, to: line.from, insert: prefix },
    selection: { anchor: line.from + prefix.length + (sel.from - line.from) }
  })
  view.focus()
}

/** 工具栏 / 快捷键：插入行内代码（单个反引号包裹，与文字同行） */
function insertInlineCode() {
  if (!view) return
  const sel = view.state.selection.main
  const selected = view.state.sliceDoc(sel.from, sel.to)
  const { insert, contentStart, contentEnd } = buildInlineCodeInsert(selected)
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert },
    selection: { anchor: sel.from + contentStart, head: sel.from + contentEnd },
  })
  view.focus()
}

/** 快捷键：Ctrl+E 插入行内代码 */
function insertInlineCodeCommand(): boolean {
  if (!view) return false
  insertInlineCode()
  return true
}

/** 工具栏：插入代码块，默认带 language 占位符便于用户替换 */
function insertCodeBlock() {
  if (!view) return
  const sel = view.state.selection.main
  const selected = view.state.sliceDoc(sel.from, sel.to)
  const lang = selected ? '' : 'language'
  const block = `\`\`\`${lang}\n${selected || '// 代码'}\n\`\`\``
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: block },
    selection: { anchor: sel.from + 4, head: sel.from + 4 + lang.length }
  })
  view.focus()
}

/** 工具栏：插入 Markdown 表格模板 */
function insertTable() {
  if (!view) return
  const table = '\n| 标题1 | 标题2 | 标题3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n'
  const sel = view.state.selection.main
  view.dispatch({ changes: { from: sel.from, to: sel.to, insert: table } })
  view.focus()
}

function insertMarkdownAtCursor(markdown: string) {
  if (!view) return
  const sel = view.state.selection.main
  const prefix = sel.from > 0 && view.state.sliceDoc(sel.from - 1, sel.from) !== '\n' ? '\n' : ''
  const insert = prefix + markdown + '\n'
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert },
    selection: { anchor: sel.from + insert.length },
  })
  view.focus()
}

function onPasteImage(e: ClipboardEvent) {
  const file = e.clipboardData ? getImageFileFromDataTransfer(e.clipboardData) : null
  if (!file) return
  e.preventDefault()
  void handleImageInsert(file, insertMarkdownAtCursor)
}

function onDragOverImage(e: DragEvent) {
  const file = e.dataTransfer ? getImageFileFromDataTransfer(e.dataTransfer) : null
  if (!file) return
  e.preventDefault()
}

function onDropImage(e: DragEvent) {
  const file = e.dataTransfer ? getImageFileFromDataTransfer(e.dataTransfer) : null
  if (!file) return
  e.preventDefault()
  void handleImageInsert(file, insertMarkdownAtCursor)
}
</script>

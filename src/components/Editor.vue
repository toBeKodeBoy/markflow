<template>
  <div class="editor-pane">
    <div class="editor-toolbar">
      <button @click="insertMarkdown('**', '**', '粗体')" title="粗体 (Ctrl+B)"><b>B</b></button>
      <button @click="insertMarkdown('*', '*', '斜体')" title="斜体 (Ctrl+I)"><i>I</i></button>
      <button @click="insertMarkdown('~~', '~~', '删除线')" title="删除线"><s>S</s></button>
      <button @click="insertMarkdown('<u>', '</u>', '下划线')" title="下划线 (Ctrl+U)"><u>U</u></button>
      <span class="sep">|</span>
      <button @click="insertLine('# ')" title="标题 1">H1</button>
      <button @click="insertLine('## ')" title="标题 2">H2</button>
      <button @click="insertLine('### ')" title="标题 3">H3</button>
      <span class="sep">|</span>
      <button @click="insertLine('- ')" title="无序列表">≡</button>
      <button @click="insertLine('1. ')" title="有序列表">1.</button>
      <button @click="insertLine('> ')" title="引用块">❝</button>
      <span class="sep">|</span>
      <button @click="insertInlineCode" title="行内代码 (Ctrl/Cmd+E)">`</button>
      <button @click="insertCodeBlock" title="代码块">&lt;/&gt;</button>
      <button @click="insertTable" title="插入表格">⊞</button>
      <button @click="insertMarkdown('[', '](url)', '链接文字')" title="插入链接">🔗</button>
      <span class="sep">|</span>
      <span class="char-count">{{ charCount }} 字</span>
    </div>
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
import { useScrollSync } from '../composables/useScrollSync'

const store = useNoteStore()
const { setRatio } = useScrollSync()
const editorEl = ref<HTMLElement>()
let view: EditorView | null = null

const isDark = computed(() => document.documentElement.getAttribute('data-theme') === 'dark')

const charCount = computed(() => store.liveContent.length || store.currentNote?.content.length || 0)

let updateTimer: ReturnType<typeof setTimeout> | null = null
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
        store.setLiveContent(content)
        if (updateTimer) clearTimeout(updateTimer)
        updateTimer = setTimeout(() => {
          store.updateCurrentContent(content)
        }, 300)
      }
    }),
    EditorView.theme({
      '&': { height: '100%', fontSize: '14px' },
      '.cm-scroller': { fontFamily: "'JetBrains Mono', 'Fira Code', monospace", overflow: 'auto' },
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
}

watch(
  () => store.currentNote?.id,
  () => {
    const content = store.currentNote?.content ?? ''
    if (view?.state.doc.toString() === content) return
    initEditor(content)
  }
)

watch(() => store.tocJumpTarget?.id, () => {
  const target = store.tocJumpTarget
  if (!target || !view) return
  const docLine = target.line + 1
  if (docLine < 1 || docLine > view.state.doc.lines) return
  const line = view.state.doc.line(docLine)
  view.dispatch({
    effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 16 })
  })
})

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

/** 编辑器滚动回调：计算滚动比例并同步到 useScrollSync */
function onEditorScroll() {
  if (!scrollerEl) return
  const { scrollTop, scrollHeight, clientHeight } = scrollerEl
  const max = scrollHeight - clientHeight
  setRatio(max > 0 ? scrollTop / max : 0)
}

onMounted(() => {
  initEditor(store.liveContent || store.currentNote?.content || '')
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
    store.setLiveContent(content)
    store.updateCurrentContent(content)
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

<template>
  <div class="editor-pane">
    <div class="editor-toolbar">
      <button @click="insertMarkdown('**', '**', '粗体')" title="粗体 (Ctrl+B)"><b>B</b></button>
      <button @click="insertMarkdown('*', '*', '斜体')" title="斜体 (Ctrl+I)"><i>I</i></button>
      <button @click="insertMarkdown('~~', '~~', '删除线')" title="删除线"><s>S</s></button>
      <span class="sep">|</span>
      <button @click="insertLine('# ')" title="标题 1">H1</button>
      <button @click="insertLine('## ')" title="标题 2">H2</button>
      <button @click="insertLine('### ')" title="标题 3">H3</button>
      <span class="sep">|</span>
      <button @click="insertLine('- ')" title="无序列表">≡</button>
      <button @click="insertLine('1. ')" title="有序列表">1.</button>
      <button @click="insertLine('> ')" title="引用块">❝</button>
      <span class="sep">|</span>
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
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { oneDark } from '@codemirror/theme-one-dark'
import { useNoteStore } from '../stores/note'
import { useScrollSync } from '../composables/useScrollSync'

const store = useNoteStore()
const { setRatio } = useScrollSync()
const editorEl = ref<HTMLElement>()
let view: EditorView | null = null

const isDark = computed(() => document.documentElement.getAttribute('data-theme') === 'dark')

const charCount = computed(() => store.liveContent.length || store.currentNote?.content.length || 0)

let updateTimer: ReturnType<typeof setTimeout> | null = null

function buildExtensions() {
  const exts = [
    history(),
    lineNumbers(),
    highlightActiveLine(),
    drawSelection(),
    markdown(),
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
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
  if (isDark.value) exts.push(oneDark)
  return exts
}

function initEditor(content: string) {
  if (view) { view.destroy(); view = null }
  scrollerEl?.removeEventListener('scroll', onEditorScroll)
  if (!editorEl.value) return
  const state = EditorState.create({
    doc: content,
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
  const content = view?.state.doc.toString() ?? store.currentNote?.content ?? ''
  initEditor(content)
})

let scrollerEl: HTMLElement | null = null

function attachScrollListener() {
  scrollerEl = editorEl.value?.querySelector('.cm-scroller') ?? null
  if (!scrollerEl) return
  scrollerEl.addEventListener('scroll', onEditorScroll)
}

function onEditorScroll() {
  if (!scrollerEl) return
  const { scrollTop, scrollHeight, clientHeight } = scrollerEl
  const max = scrollHeight - clientHeight
  setRatio(max > 0 ? scrollTop / max : 0)
}

onMounted(() => {
  initEditor(store.currentNote?.content ?? '')
  attachScrollListener()
})

onBeforeUnmount(() => {
  scrollerEl?.removeEventListener('scroll', onEditorScroll)
  view?.destroy()
})

// Toolbar helpers
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

function insertCodeBlock() {
  if (!view) return
  const sel = view.state.selection.main
  const selected = view.state.sliceDoc(sel.from, sel.to)
  const block = '```\n' + (selected || '// 代码') + '\n```'
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: block },
    selection: { anchor: sel.from + 4 }
  })
  view.focus()
}

function insertTable() {
  if (!view) return
  const table = '\n| 标题1 | 标题2 | 标题3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n'
  const sel = view.state.selection.main
  view.dispatch({ changes: { from: sel.from, to: sel.to, insert: table } })
  view.focus()
}
</script>

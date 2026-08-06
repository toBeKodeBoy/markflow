<template>
  <div class="editor-pane">
    <FormatToolbar
      :view-mode="viewMode"
      @bold="insertMarkdown('**', '**', '粗体')"
      @italic="insertMarkdown('*', '*', '斜体')"
      @strike="insertMarkdown('~~', '~~', '删除线')"
      @underline="insertUnderline()"
      @highlight="onToolbarHighlight"
      @h1="insertLine('# ')"
      @h2="insertLine('## ')"
      @h3="insertLine('### ')"
      @bullet-list="insertLine('- ')"
      @ordered-list="insertLine('1. ')"
      @task-list="insertTaskList()"
      @blockquote="insertLine('> ')"
      @inline-code="insertInlineCode()"
      @code-block="insertCodeBlock()"
      @table="insertTable()"
      @link="openLinkDialog()"
      @image-upload="onToolbarImageUpload"
      @set-view-mode="(mode) => emit('setViewMode', mode)"
    />
    <div ref="editorEl" class="cm-host"></div>
    <LinkDialog
      :visible="linkDialogVisible"
      :draft="linkDraft"
      @confirm="confirmLinkDialog"
      @cancel="closeLinkDialog"
    />
    <HighlightTextModal
      :visible="highlightDialogVisible"
      :initial-text="highlightDialogText"
      @confirm="confirmHighlightDialog"
      @cancel="closeHighlightDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { closeBracketsKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { EditorSelection, EditorState, Compartment, Prec } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView, drawSelection, highlightActiveLine, keymap, lineNumbers } from '@codemirror/view'
import { autoCloseBracketsExtensions } from '../extensions/autoCloseBrackets'
import { useScrollSync } from '../composables/useScrollSync'
import { useEditorTabsStore } from '../stores/editorTabs'
import { useNoteStore } from '../stores/note'
import { buildInlineCodeInsert } from '../utils/inlineCode'
import { getImageFileFromDataTransfer, handleImageInsert } from '../utils/imageInsert'
import {
  getInitialLinkDraft,
  isLinkEditFailure,
  readSourceLinkSelection,
  replaceMarkdownSelectionWithLink,
  type LinkDraft,
  type SourceLinkSelection,
} from '../utils/linkEditing'
import { showAppNotification } from '../utils/notify'
import FormatToolbar from './FormatToolbar.vue'
import HighlightTextModal from './HighlightTextModal.vue'
import LinkDialog from './LinkDialog.vue'
import type { ViewMode } from '../types'

const props = defineProps<{ noteId: string; viewMode?: ViewMode }>()
const emit = defineEmits<{ setViewMode: [mode: ViewMode] }>()

const viewMode = computed(() => props.viewMode ?? 'live')

const store = useNoteStore()
const tabsStore = useEditorTabsStore()
const { setRatio } = useScrollSync()
const editorEl = ref<HTMLElement>()
let view: EditorView | null = null

const isActive = computed(() => tabsStore.activeTabId === props.noteId)
const isDark = computed(() => document.documentElement.getAttribute('data-theme') === 'dark')

const linkDialogVisible = ref(false)
const linkDraft = ref<LinkDraft>(getInitialLinkDraft(''))
const highlightDialogVisible = ref(false)
const highlightDialogText = ref('')
let pendingLinkSelection: SourceLinkSelection | null = null
let pendingHighlightSelection: { from: number; to: number } | null = null
let updateTimer: ReturnType<typeof setTimeout> | null = null
let pendingEditorPush: string | null = null
let scrollerEl: HTMLElement | null = null

const themeCompartment = new Compartment()

function applyEditorPush(content: string) {
  if (!view) return
  if (view.state.doc.toString() === content) return
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: content } })
}

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
      if (!update.docChanged) return
      const content = update.state.doc.toString()
      tabsStore.setTabLiveContent(props.noteId, content)
      if (updateTimer) clearTimeout(updateTimer)
      updateTimer = setTimeout(() => {
        store.updateNoteContent(props.noteId, content)
        const tab = tabsStore.tabs.find((t) => t.noteId === props.noteId)
        if (tab) tab.savedContent = content
      }, 300)
    }),
    EditorView.theme({
      '&': { height: '100%', fontSize: 'var(--editor-font-size, 14px)' },
      '.cm-scroller': { fontFamily: 'var(--editor-font-family, var(--font-mono))', overflow: 'auto' },
      '.cm-content': { padding: '16px' },
    }),
  ]
  exts.push(themeCompartment.of(isDark.value ? oneDark : []))
  return exts
}

function initEditor(content: string) {
  if (view) {
    view.destroy()
    view = null
  }
  scrollerEl?.removeEventListener('scroll', onEditorScroll)
  if (!editorEl.value) return
  view = new EditorView({
    state: EditorState.create({
      doc: content ?? '',
      extensions: buildExtensions(),
    }),
    parent: editorEl.value,
  })
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
  },
)

watch(
  () => store.tocJumpTarget?.id,
  () => {
    if (!isActive.value || !view) return
    const target = store.tocJumpTarget
    if (!target) return
    const docLine = target.line + 1
    if (docLine < 1 || docLine > view.state.doc.lines) return
    const line = view.state.doc.line(docLine)
    view.dispatch({
      effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 16 }),
    })
  },
)

watch(isDark, () => {
  if (!view) return
  view.dispatch({ effects: themeCompartment.reconfigure(isDark.value ? oneDark : []) })
})

function attachScrollListener() {
  scrollerEl = editorEl.value?.querySelector('.cm-scroller') ?? null
  if (!scrollerEl) return
  scrollerEl.addEventListener('scroll', onEditorScroll)
}

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
  if (!host) return
  host.addEventListener('paste', onPasteImage)
  host.addEventListener('dragover', onDragOverImage)
  host.addEventListener('drop', onDropImage)
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

function insertMarkdown(before: string, after: string, placeholder: string) {
  if (!view) return
  const sel = view.state.selection.main
  const selected = view.state.sliceDoc(sel.from, sel.to) || placeholder
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: before + selected + after },
    selection: {
      anchor: sel.from + before.length,
      head: sel.from + before.length + selected.length,
    },
  })
  view.focus()
}

function insertUnderline(): boolean {
  if (!view) return false
  insertMarkdown('<u>', '</u>', '下划线')
  return true
}

function onToolbarHighlight() {
  if (!view) return
  const { from, to, empty } = view.state.selection.main
  if (!empty) {
    insertMarkdown('==', '==', '高亮文本')
    return
  }
  pendingHighlightSelection = { from, to }
  highlightDialogText.value = ''
  highlightDialogVisible.value = true
}

function closeHighlightDialog() {
  highlightDialogVisible.value = false
  highlightDialogText.value = ''
  pendingHighlightSelection = null
}

function confirmHighlightDialog(text: string) {
  if (!view || !pendingHighlightSelection) return
  const { from, to } = pendingHighlightSelection
  const insert = `==${text}==`
  view.dispatch({
    changes: { from, to, insert },
    selection: EditorSelection.single(from + insert.length),
  })
  closeHighlightDialog()
  view.focus()
}

function insertLine(prefix: string) {
  if (!view) return
  const sel = view.state.selection.main
  const line = view.state.doc.lineAt(sel.from)
  view.dispatch({
    changes: { from: line.from, to: line.from, insert: prefix },
    selection: { anchor: line.from + prefix.length + (sel.from - line.from) },
  })
  view.focus()
}

function insertTaskList() {
  if (!view) return
  const sel = view.state.selection.main
  const needsLeadingNewline = sel.from > 0 && view.state.sliceDoc(sel.from - 1, sel.from) !== '\n'
  const needsTrailingNewline = sel.to < view.state.doc.length && view.state.sliceDoc(sel.to, sel.to + 1) !== '\n'
  const prefix = needsLeadingNewline ? '\n' : ''
  const block = '- [ ] \n- [ ] \n- [ ] '
  const suffix = needsTrailingNewline ? '\n' : ''
  const insert = prefix + block + suffix
  const cursor = sel.from + prefix.length + '- [ ] '.length

  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert },
    selection: EditorSelection.single(cursor),
  })
  view.focus()
}

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

function insertInlineCodeCommand(): boolean {
  if (!view) return false
  insertInlineCode()
  return true
}

function insertCodeBlock() {
  if (!view) return
  const sel = view.state.selection.main
  const selected = view.state.sliceDoc(sel.from, sel.to)
  const lang = selected ? '' : 'language'
  const block = `\`\`\`${lang}\n${selected || '// 代码'}\n\`\`\``
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: block },
    selection: { anchor: sel.from + 4, head: sel.from + 4 + lang.length },
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

function openLinkDialog() {
  if (!view) return
  const selection = readSourceLinkSelection(view.state.doc.toString(), {
    from: view.state.selection.main.from,
    to: view.state.selection.main.to,
  })
  if (isLinkEditFailure(selection)) {
    showAppNotification(selection.reason)
    return
  }
  pendingLinkSelection = selection
  linkDraft.value = {
    text: selection.text,
    url: selection.url,
    title: selection.title,
  }
  linkDialogVisible.value = true
}

function closeLinkDialog() {
  linkDialogVisible.value = false
}

function confirmLinkDialog(draft: LinkDraft) {
  if (!view || !pendingLinkSelection) return
  const result = replaceMarkdownSelectionWithLink(view.state.doc.toString(), pendingLinkSelection, draft)
  if (!result.ok) {
    showAppNotification(result.reason)
    return
  }
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: result.content },
    selection: { anchor: result.selection.from, head: result.selection.to },
  })
  linkDialogVisible.value = false
  view.focus()
}

function onToolbarImageUpload(file: File) {
  void handleImageInsert(file, insertMarkdownAtCursor)
}

function onPasteImage(event: ClipboardEvent) {
  const file = event.clipboardData ? getImageFileFromDataTransfer(event.clipboardData) : null
  if (!file) return
  event.preventDefault()
  void handleImageInsert(file, insertMarkdownAtCursor)
}

function onDragOverImage(event: DragEvent) {
  const file = event.dataTransfer ? getImageFileFromDataTransfer(event.dataTransfer) : null
  if (!file) return
  event.preventDefault()
}

function onDropImage(event: DragEvent) {
  const file = event.dataTransfer ? getImageFileFromDataTransfer(event.dataTransfer) : null
  if (!file) return
  event.preventDefault()
  void handleImageInsert(file, insertMarkdownAtCursor)
}

defineExpose({
  get view() {
    return view
  },
})
</script>

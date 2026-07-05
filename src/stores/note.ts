import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStorage } from '../composables/useStorage'
import { getAssetStorage } from '../composables/useAssetStorage'
import { collectAllNoteContents } from '../utils/resolveMarkdownAssets'
import { LARGE_FILE_THRESHOLD } from '../constants'
import { applyTocToContent } from '../utils/generateTocMarkdown'
import type { Note, NoteListItem, Folder, TocJumpTarget, EditorContentPush } from '../types'

const TITLE_SCAN_LINES = 50

/** 将笔记正文规范化为可搜索文本（小写） */
function normalizeForSearch(text: string): string {
  return text.toLowerCase()
}

/** 生成唯一 ID：当前时间戳(36进制) + 随机数(36进制) */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

/** 从内容中提取标题：优先取首个 # 标题，其次取首个非空行(限30字)，均无则返回"无标题" */
function extractTitle(content: string): string {
  let line = 0
  let start = 0
  while (line < TITLE_SCAN_LINES && start <= content.length) {
    const end = content.indexOf('\n', start)
    const lineEnd = end === -1 ? content.length : end
    const chunk = content.slice(start, lineEnd)
    const heading = chunk.match(/^#+\s+(.+)/)
    if (heading) return heading[1].trim()
    if (chunk.trim()) return chunk.trim().slice(0, 30)
    line++
    if (end === -1) break
    start = end + 1
  }
  return '无标题'
}

export const useNoteStore = defineStore('note', () => {
  const storage = useStorage()

  const noteList = ref<NoteListItem[]>([])
  const currentNote = ref<Note | null>(null)
  const liveContent = ref('')
  const folderList = ref<Folder[]>([])
  const searchQuery = ref('')
  const activeFolderId = ref<string | null>(null)
  /** 笔记正文搜索索引（id → 小写正文），loadNoteList 时重建 */
  const contentSearchIndex = ref<Record<string, string>>({})
  const tocVisible = ref(false)
  const tocJumpTarget = ref<TocJumpTarget | null>(null)
  const editorContentPush = ref<EditorContentPush | null>(null)
  const pendingLargeFileSwitch = ref(false)
  let tocJumpSeq = 0
  let editorContentPushSeq = 0

  /** 根据 activeFolderId 和 searchQuery 过滤后的笔记列表 */
  const filteredNoteList = computed(() => {
    let list = noteList.value
    if (activeFolderId.value) {
      list = list.filter(n => n.folderId === activeFolderId.value)
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (contentSearchIndex.value[n.id]?.includes(q) ?? false)
      )
    }
    return list
  })

  /** 大文件策略：内容长度超过阈值时标记 pendingLargeFileSwitch */
  function applyLargeFilePolicy(content: string) {
    if (content.length > LARGE_FILE_THRESHOLD) {
      pendingLargeFileSwitch.value = true
    }
  }

  /** 清除大文件切换标记 */
  function clearPendingLargeFileSwitch() {
    pendingLargeFileSwitch.value = false
  }

  /** 设置目录面板显隐状态 */
  function setTocVisible(visible: boolean) {
    tocVisible.value = visible
  }

  /** 更新单篇笔记的正文搜索索引 */
  function updateSearchIndex(id: string, content: string) {
    contentSearchIndex.value = {
      ...contentSearchIndex.value,
      [id]: normalizeForSearch(content),
    }
  }

  /** 从存储重建全部笔记的正文搜索索引 */
  function rebuildSearchIndex() {
    const index: Record<string, string> = {}
    for (const item of noteList.value) {
      const note = storage.getNote(item.id)
      if (note?.content) index[item.id] = normalizeForSearch(note.content)
    }
    contentSearchIndex.value = index
  }

  /** 从存储加载笔记列表和文件夹列表 */
  function loadNoteList() {
    noteList.value = storage.getNoteList()
    folderList.value = storage.getFolderList()
    rebuildSearchIndex()
  }

  /** 打开指定笔记：从存储读取完整内容，设为当前，检查大文件策略 */
  function openNote(id: string) {
    const note = storage.getNote(id)
    if (note) {
      currentNote.value = note
      liveContent.value = note.content
      applyLargeFilePolicy(note.content)
    }
  }

  /** 设置实时编辑内容（不持久化） */
  function setLiveContent(content: string) {
    liveContent.value = content
  }

  /** 创建空白笔记，保存到存储，设为当前 */
  function createNote(folderId?: string) {
    const now = Date.now()
    const note: Note = {
      id: generateId(),
      title: '无标题',
      content: '# 无标题\n\n',
      folderId,
      tags: [],
      createdAt: now,
      updatedAt: now
    }
    storage.saveNote(note)
    noteList.value = storage.getNoteList()
    updateSearchIndex(note.id, note.content)
    currentNote.value = note
    liveContent.value = note.content
    return note
  }

  /** 以指定内容创建笔记，自动提取标题，保存并设为当前 */
  function createNoteWithContent(content: string, folderId?: string) {
    const now = Date.now()
    const title = extractTitle(content)
    const note: Note = {
      id: generateId(),
      title,
      content,
      folderId,
      tags: [],
      createdAt: now,
      updatedAt: now
    }
    storage.saveNote(note)
    noteList.value = storage.getNoteList()
    updateSearchIndex(note.id, content)
    currentNote.value = note
    liveContent.value = content
    applyLargeFilePolicy(content)
    return note
  }

  /** 保存当前笔记内容变更（title/content/updatedAt），同步更新 noteList */
  function updateCurrentContent(content: string) {
    if (!currentNote.value) return
    liveContent.value = content
    const title = extractTitle(content)
    currentNote.value.content = content
    currentNote.value.title = title
    currentNote.value.updatedAt = Date.now()
    storage.saveNote(currentNote.value)
    updateSearchIndex(currentNote.value.id, content)
    const idx = noteList.value.findIndex(n => n.id === currentNote.value!.id)
    if (idx >= 0) {
      noteList.value[idx].title = title
      noteList.value[idx].updatedAt = currentNote.value.updatedAt
    }
  }

  /** 删除笔记：移除存储，若为当前笔记则导航到列表首项或清空 */
  function deleteNote(id: string) {
    storage.removeNote(id)
    noteList.value = storage.getNoteList()
    const nextIndex = { ...contentSearchIndex.value }
    delete nextIndex[id]
    contentSearchIndex.value = nextIndex
    const contents = collectAllNoteContents(
      () => storage.getNoteList(),
      (noteId) => storage.getNote(noteId)
    )
    void getAssetStorage().gcOrphans(contents)
    if (currentNote.value?.id === id) {
      if (noteList.value.length > 0) {
        openNote(noteList.value[0].id)
      } else {
        currentNote.value = null
        liveContent.value = ''
      }
    }
  }

  /** 重命名笔记并更新存储 */
  function renameNote(id: string, title: string) {
    const note = storage.getNote(id)
    if (!note) return
    note.title = title
    note.updatedAt = Date.now()
    storage.saveNote(note)
    noteList.value = storage.getNoteList()
    if (currentNote.value?.id === id) currentNote.value.title = title
  }

  /** 移动笔记到指定文件夹 */
  function moveNote(id: string, folderId: string | undefined) {
    const note = storage.getNote(id)
    if (!note) return
    if (note.folderId === folderId) return

    note.folderId = folderId
    note.updatedAt = Date.now()
    storage.saveNote(note)
    noteList.value = storage.getNoteList()

    if (currentNote.value?.id === id) {
      currentNote.value.folderId = folderId
    }
  }

  /** 创建文件夹并持久化 */
  function createFolder(name: string) {
    const folder: Folder = { id: generateId(), name, order: folderList.value.length }
    folderList.value.push(folder)
    storage.saveFolderList(folderList.value)
    return folder
  }

  /** 删除文件夹：笔记移回根目录，清除当前文件夹筛选 */
  function deleteFolder(id: string) {
    for (const item of noteList.value) {
      if (item.folderId !== id) continue
      const note = storage.getNote(item.id)
      if (!note) continue
      note.folderId = undefined
      note.updatedAt = Date.now()
      storage.saveNote(note)
      item.folderId = undefined
      item.updatedAt = note.updatedAt
    }
    if (currentNote.value?.folderId === id) {
      currentNote.value.folderId = undefined
    }
    folderList.value = folderList.value.filter(f => f.id !== id)
    storage.saveFolderList(folderList.value)
    if (activeFolderId.value === id) activeFolderId.value = null
  }

  /** 请求跳转到目录指定标题：递增 seq 触发 watcher */
  function requestTocJump(line: number, index: number) {
    tocJumpTarget.value = { line, index, id: ++tocJumpSeq }
  }

  /** 将目录块插入当前笔记；成功返回 true */
  function insertAutoToc(): boolean {
    if (!currentNote.value) return false
    const content = liveContent.value || currentNote.value.content
    const next = applyTocToContent(content)
    if (next === content) return false
    liveContent.value = next
    updateCurrentContent(next)
    editorContentPush.value = { content: next, id: ++editorContentPushSeq }
    return true
  }

  /** 重命名文件夹并持久化 */
  function renameFolder(id: string, name: string) {
    const folder = folderList.value.find(f => f.id === id)
    if (folder) {
      folder.name = name
      storage.saveFolderList(folderList.value)
    }
  }

  return {
    noteList, currentNote, liveContent, folderList, searchQuery, activeFolderId, filteredNoteList,
    tocVisible, tocJumpTarget, editorContentPush, pendingLargeFileSwitch,
    loadNoteList, openNote, createNote, createNoteWithContent, setLiveContent, setTocVisible,
    updateCurrentContent, deleteNote, renameNote, moveNote, requestTocJump, insertAutoToc,
    clearPendingLargeFileSwitch,
    createFolder, deleteFolder, renameFolder
  }
})

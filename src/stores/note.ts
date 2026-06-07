import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStorage } from '../composables/useStorage'
import { LARGE_FILE_THRESHOLD } from '../constants'
import type { Note, NoteListItem, Folder, TocJumpTarget } from '../types'

const TITLE_SCAN_LINES = 50

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

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
  const tocVisible = ref(false)
  const tocJumpTarget = ref<TocJumpTarget | null>(null)
  const pendingLargeFileSwitch = ref(false)
  let tocJumpSeq = 0

  const filteredNoteList = computed(() => {
    let list = noteList.value
    if (activeFolderId.value) {
      list = list.filter(n => n.folderId === activeFolderId.value)
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      list = list.filter(n => n.title.toLowerCase().includes(q))
    }
    return list
  })

  function applyLargeFilePolicy(content: string) {
    if (content.length > LARGE_FILE_THRESHOLD) {
      pendingLargeFileSwitch.value = true
    }
  }

  function clearPendingLargeFileSwitch() {
    pendingLargeFileSwitch.value = false
  }

  function setTocVisible(visible: boolean) {
    tocVisible.value = visible
  }

  function loadNoteList() {
    noteList.value = storage.getNoteList()
    folderList.value = storage.getFolderList()
  }

  function openNote(id: string) {
    const note = storage.getNote(id)
    if (note) {
      currentNote.value = note
      liveContent.value = note.content
      applyLargeFilePolicy(note.content)
    }
  }

  function setLiveContent(content: string) {
    liveContent.value = content
  }

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
    currentNote.value = note
    liveContent.value = note.content
    return note
  }

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
    currentNote.value = note
    liveContent.value = content
    applyLargeFilePolicy(content)
    return note
  }

  function updateCurrentContent(content: string) {
    if (!currentNote.value) return
    liveContent.value = content
    const title = extractTitle(content)
    currentNote.value.content = content
    currentNote.value.title = title
    currentNote.value.updatedAt = Date.now()
    storage.saveNote(currentNote.value)
    const idx = noteList.value.findIndex(n => n.id === currentNote.value!.id)
    if (idx >= 0) {
      noteList.value[idx].title = title
      noteList.value[idx].updatedAt = currentNote.value.updatedAt
    }
  }

  function deleteNote(id: string) {
    storage.removeNote(id)
    noteList.value = storage.getNoteList()
    if (currentNote.value?.id === id) {
      if (noteList.value.length > 0) {
        openNote(noteList.value[0].id)
      } else {
        currentNote.value = null
        liveContent.value = ''
      }
    }
  }

  function renameNote(id: string, title: string) {
    const note = storage.getNote(id)
    if (!note) return
    note.title = title
    note.updatedAt = Date.now()
    storage.saveNote(note)
    noteList.value = storage.getNoteList()
    if (currentNote.value?.id === id) currentNote.value.title = title
  }

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

  function createFolder(name: string) {
    const folder: Folder = { id: generateId(), name, order: folderList.value.length }
    folderList.value.push(folder)
    storage.saveFolderList(folderList.value)
    return folder
  }

  function deleteFolder(id: string) {
    folderList.value = folderList.value.filter(f => f.id !== id)
    storage.saveFolderList(folderList.value)
    if (activeFolderId.value === id) activeFolderId.value = null
  }

  function requestTocJump(line: number, index: number) {
    tocJumpTarget.value = { line, index, id: ++tocJumpSeq }
  }

  function renameFolder(id: string, name: string) {
    const folder = folderList.value.find(f => f.id === id)
    if (folder) {
      folder.name = name
      storage.saveFolderList(folderList.value)
    }
  }

  return {
    noteList, currentNote, liveContent, folderList, searchQuery, activeFolderId, filteredNoteList,
    tocVisible, tocJumpTarget, pendingLargeFileSwitch,
    loadNoteList, openNote, createNote, createNoteWithContent, setLiveContent, setTocVisible,
    updateCurrentContent, deleteNote, renameNote, moveNote, requestTocJump, clearPendingLargeFileSwitch,
    createFolder, deleteFolder, renameFolder
  }
})

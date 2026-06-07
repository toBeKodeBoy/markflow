export interface Note {
  id: string
  title: string
  content: string
  folderId?: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface Folder {
  id: string
  name: string
  order: number
}

export interface NoteListItem {
  id: string
  title: string
  folderId?: string
  updatedAt: number
}

export interface TocJumpTarget {
  line: number
  index: number
  id: number
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: number
  editorFontFamily: string
  previewVisible: boolean
  sidebarVisible: boolean
}

// uTools preload bridge type
export interface MarkFlowBridge {
  getNoteList: () => NoteListItem[]
  saveNoteList: (list: NoteListItem[]) => void
  getNote: (id: string) => Note | null
  saveNote: (id: string, data: Note) => void
  removeNote: (id: string) => void
  getFolderList: () => Folder[]
  saveFolderList: (list: Folder[]) => void
  getSettings: () => AppSettings
  saveSettings: (settings: AppSettings) => void
  showNotification: (msg: string) => void
  saveMarkdownFile: (filename: string, content: string) => boolean
  openMarkdownFile: () => string | null
  isDarkTheme: () => boolean
  hideMainWindow: () => void
}

declare global {
  interface Window {
    markflow: MarkFlowBridge
  }
}

/** WYSIWYG 所见即所得（UI 标签「预览」）| split 分屏 | source 源码 | focus 专注 */
export type ViewMode = 'live' | 'split' | 'source' | 'focus'

import type { AssetIndexItem, AssetRecord } from './asset'
export type { AssetIndexItem, AssetRecord } from './asset'

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

/** 外部写入编辑器内容（如插入目录）时的同步令牌 */
export interface EditorContentPush {
  content: string
  id: number
}

/** PDF 纸张尺寸 */
export type PdfPageSize = 'A4' | 'A3' | 'Letter'

/** PDF 页边距预设 */
export type PdfMarginPreset = 'default' | 'narrow' | 'wide' | 'none'

/** PDF 导出选项（持久化到 AppSettings） */
export interface PdfExportOptions {
  pageSize: PdfPageSize
  margin: PdfMarginPreset
  /** 是否打印背景色（代码块、表格底色等） */
  printBackground: boolean
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: number
  editorFontFamily: string
  previewVisible: boolean
  sidebarVisible: boolean
  /** PDF 导出选项（可选，缺省用默认值） */
  pdfExport?: PdfExportOptions
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
  /** Typora 路线：完整 HTML → Chromium printToPDF */
  savePdfFromHtml: (
    filename: string,
    html: string,
    options?: PdfExportOptions
  ) => Promise<{ ok: true } | { ok: false; reason: 'cancel' | 'error' }>
  openMarkdownFile: () => string | null
  isDarkTheme: () => boolean
  hideMainWindow: () => void
  copyText: (text: string) => boolean
  getAssetIndex: () => AssetIndexItem[]
  saveAssetIndex: (index: AssetIndexItem[]) => void
  getAsset: (id: string) => AssetRecord | null
  saveAsset: (id: string, record: AssetRecord) => void
  removeAsset: (id: string) => void
}

declare global {
  interface Window {
    markflow: MarkFlowBridge
  }
}

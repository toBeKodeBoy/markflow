/** WYSIWYG 所见即所得（UI 标签「编辑」）| split 分屏 | source 源码 | focus 专注 */
export type ViewMode = 'live' | 'split' | 'source' | 'focus'

import type { AssetIndexItem, AssetRecord } from './asset'
export type { AssetIndexItem, AssetRecord } from './asset'
export type {
  ImportFolderFile,
  ImportFolderImage,
  ImportFolderScanResult,
  ImportFolderOptions,
  ImportFolderProgress,
  ImportFolderResult,
  PersistedImportFolderOptions,
} from './import'
import type { ImportFolderScanResult } from './import'

export interface Note {
  id: string
  title: string
  content: string
  folderId?: string
  tags: string[]
  pinned?: boolean
  sortOrder?: number
  /** 文件夹导入时的源相对路径；存在时不从正文自动改标题 */
  importSourcePath?: string
  createdAt: number
  updatedAt: number
}

export interface Folder {
  id: string
  name: string
  order: number
  parentId?: string
}

export interface NoteListItem {
  id: string
  title: string
  folderId?: string
  updatedAt: number
  tags?: string[]
  pinned?: boolean
  sortOrder?: number
}

/** 标签云统计项（全局频率，非搜索结果内） */
export interface TagStat {
  tag: string
  count: number
  /** 0–1，相对最大 count */
  weight: number
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

/** 自动备份间隔（小时） */
export type AutoBackupInterval = 6 | 12 | 24 | 168

/** 自动备份设置（持久化到 AppSettings） */
export interface AutoBackupSettings {
  enabled: boolean
  intervalHours: AutoBackupInterval
  /** uTools 本地目录绝对路径 */
  directoryPath?: string
  /** 保留份数，0 表示不限制 */
  maxCopies: number
  lastBackupAt?: number
  lastBackupStatus?: 'success' | 'error' | 'running'
  lastBackupPath?: string
  lastBackupError?: string
}

/** 持久化的编辑器 Tab 状态 */
export interface EditorTabsSettings {
  openNoteIds: string[]
  activeNoteId: string | null
}

export interface EditorTab {
  noteId: string
  liveContent: string
  savedContent: string
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: number
  editorFontFamily: string
  previewVisible: boolean
  sidebarVisible: boolean
  /** 侧栏宽度（px），默认 240 */
  sidebarWidth?: number
  /** 侧栏展开的文件夹 id */
  sidebarExpandedFolderIds?: string[]
  /** 侧栏选中的文件夹（新建笔记目标） */
  sidebarActiveFolderId?: string | null
  /** PDF 导出选项（可选，缺省用默认值） */
  pdfExport?: PdfExportOptions
  /** 侧栏标签云折叠（未设置时：标签 ≤3 默认折叠） */
  sidebarTagCloudCollapsed?: boolean
  /** 自动备份配置 */
  autoBackup?: AutoBackupSettings
  /** 上次打开的编辑器 Tab（启动时恢复） */
  editorTabs?: EditorTabsSettings
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
  openMarkdownFolder: () => Promise<ImportFolderScanResult | null>
  isDarkTheme: () => boolean
  hideMainWindow: () => void
  copyText: (text: string) => boolean
  saveBackupFile: (
    jsonString: string,
    defaultName: string
  ) => { ok: true; path: string } | { ok: false; reason: 'cancel' | 'error' }
  openBackupFile: () => string | null
  selectBackupDirectory: () => string | null
  writeBackupFileSilent: (
    dirPath: string,
    filename: string,
    content: string
  ) => { ok: true; path: string } | { ok: false; reason: 'error' }
  cleanOldBackupFiles: (
    dirPath: string,
    maxCopies: number
  ) => { ok: true; deleted: number } | { ok: false; reason: 'error' }
  /** uTools 默认自动备份目录（appData/markflow-backups） */
  getDefaultBackupDirectory?: () => string | null
  /** 自动备份桥接能力探测 */
  getAutoBackupCapabilities?: () => {
    version: number
    available: boolean
    isDev: boolean
  }
  /** 在文件管理器中打开目录 */
  openBackupDirectory?: (dirPath: string) => boolean
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

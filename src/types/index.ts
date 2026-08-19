/** WYSIWYG 所见即所得（UI 标签「预览」）| split 分屏 | source 源码 | focus 专注 */
export type ViewMode = 'live' | 'split' | 'source' | 'focus'

import type { AssetIndexItem, AssetRecord } from './asset'
export type { AssetIndexItem, AssetRecord } from './asset'
export type {
  ImageExportMode,
  ImageExportOverwriteStrategy,
  ImageExportSettings,
} from './imageExport'
export type {
  ImportFolderFile,
  ImportFolderImage,
  ImportFolderScanResult,
  ImportFolderOptions,
  ImportFolderProgress,
  ImportFolderResult,
  PersistedImportFolderOptions,
} from './import'
import type { ImportFolderImage, ImportFolderScanResult } from './import'
import type { ImageExportSettings } from './imageExport'

export interface Note {
  id: string
  title: string
  content: string
  folderId?: string
  pinned?: boolean
  sortOrder?: number
  /** 文件夹导入时的源相对路径；存在时不从正文自动改标题 */
  importSourcePath?: string
  /** 单文件导入时的源文件绝对路径 */
  sourceFilePath?: string
  workingFilePath?: string
  assetDirectoryPath?: string
  assetDirectoryTemplate?: string
  assetPathMode?: 'internal' | 'file-bound'
  assetLinkStyle?: 'absolute' | 'relative'
  managedAssetIds?: string[]
  /** 导入来源标题锁定；存在时编辑正文不自动改标题 */
  titleLockedFromSource?: boolean
  /** 删除时间戳（软删除标记） */
  deletedAt?: number
  createdAt: number
  updatedAt: number
}

export interface ImportedMarkdownFile {
  content: string
  path: string
  name: string
  images: ImportFolderImage[]
}

export interface Folder {
  id: string
  name: string
  order: number
  parentId?: string
  /** 是否置顶 */
  pinned?: boolean
  /** 移入回收站时间戳 */
  trashAt?: number
  /** 创建时间 */
  createdAt?: number
  /** 更新时间 */
  updatedAt?: number
}

export interface NoteListItem {
  id: string
  title: string
  folderId?: string
  updatedAt: number
  pinned?: boolean
  sortOrder?: number
}

/** 回收站中的笔记（继承 Note，扩展删除元数据） */
export interface TrashNote extends Note {
  deletedBy: 'user' | 'auto'  // 删除来源：手动 / 自动清理
  restoredAt?: number          // 恢复时间戳（可选）
}

/** 回收站中的文件夹条目（含子树快照） */
export interface TrashFolderEntry {
  folder: Folder              // 被删除的根文件夹
  descendantFolders: Folder[] // 被删除的子文件夹列表
  noteIds: string[]           // 被删除文件夹内的笔记 ID 列表
  deletedAt: number           // 删除时间戳
  deletedBy: 'user' | 'auto'  // 删除来源
  originalParentId?: string   // 原父级 ID（恢复时用）
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

/** PDF 页面方向 */
export type PdfOrientation = 'portrait' | 'landscape'

/** PDF 导出选项（持久化到 AppSettings） */
export interface PdfExportOptions {
  pageSize: PdfPageSize
  margin: PdfMarginPreset
  /** 是否打印背景色（代码块、表格底色等） */
  printBackground: boolean
  /** 页面方向 */
  landscape: PdfOrientation
  /** Chromium printToPDF 缩放 */
  scale: number
  /** 是否启用页眉页脚 */
  displayHeaderFooter: boolean
  /** 优先使用 CSS @page size */
  preferCssPageSize: boolean
}

/** 自动备份间隔（小时） */
export type AutoBackupInterval = 6 | 12 | 24 | 168

/** 自动备份设置（持久化到 AppSettings） */
export interface AutoBackupSettings {
  enabled: boolean
  intervalHours: AutoBackupInterval
  /** uTools 本地目录绝对路径 */
  directoryPath?: string
  /** 保留份数；0 表示不限制 */
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
  /** 各笔记上次使用的视图模式（预览=live） */
  viewModesByNoteId?: Record<string, ViewMode>
}

/** 最近访问的笔记记录 */
export interface RecentNoteAccess {
  noteId: string
  /** 最后一次打开时间 */
  openedAt: number
}

export interface EditorTab {
  noteId: string
  liveContent: string
  savedContent: string
  /** 该文档绑定的视图模式；新建默认为 live（预览） */
  viewMode: ViewMode
}

export interface TableToolbarContext {
  rowIndex: number
  colIndex: number
  rowCount: number
  colCount: number
  canDeleteRow: boolean
  canDeleteCol: boolean
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
  /** 侧栏展开的空间 id */
  sidebarExpandedSpaceIds?: string[]
  /** 「我的空间」一次性展开迁移标记（老用户升级兼容） */
  myFolderIntroMigrated?: boolean
  /** 侧栏选中的文件夹（新建笔记目标） */
  sidebarActiveFolderId?: string | null
  /** PDF 导出选项（可选，缺省用默认值） */
  pdfExport?: PdfExportOptions
  /** 自动备份配置 */
  autoBackup?: AutoBackupSettings
  /** 上次打开的编辑器 Tab（启动时恢复） */
  editorTabs?: EditorTabsSettings
  /** 最近访问的笔记（LRU，最多 30 条） */
  recentNoteAccess?: RecentNoteAccess[]
  imageExport?: ImageExportSettings
  /** 回收站保留天数（默认 30） */
  trashRetentionDays?: number
  /** 空库新手引导是否已关闭（跳过或勾选不再展示） */
  onboardingDismissed?: boolean
  /** 按需创建的新手教程笔记 id */
  tutorialNoteId?: string | null
  /** 示例知识库是否已导入（幂等） */
  exampleLibraryImported?: boolean
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
  selectMarkdownSavePath?: (
    filename: string
  ) => { ok: true; path: string } | { ok: false; reason: 'cancel' | 'error' }
  writeTextFile?: (
    filePath: string,
    content: string
  ) => { ok: true } | { ok: false; reason: 'error' }
  /** Typora 路线：完整 HTML -> Chromium printToPDF */
  savePdfFromHtml: (
    filename: string,
    html: string,
    options?: PdfExportOptions
  ) => Promise<{ ok: true } | { ok: false; reason: 'cancel' | 'error' }>
  appendAppLog?: (
    level: 'debug' | 'info' | 'warn' | 'error',
    scope: string,
    message: string,
    data?: Record<string, unknown>,
  ) => void | string
  openExternalUrl?: (url: string) => boolean
  openLocalPath?: (pathOrFileUrl: string) => boolean
  getLinkOpenCapabilities?: () => {
    version: number
    external: boolean
    localFile: boolean
  }
  openMarkdownFile: () => ImportedMarkdownFile | null
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
  /** uTools 默认自动备份目录（AppData/markflow-backups） */
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

  // 回收站相关
  getTrashNotes: () => TrashNote[]
  saveTrashNotes: (notes: TrashNote[]) => void

  ensureDirectory?: (dirPath: string) => { ok: true } | { ok: false; reason: 'error' }
  writeAssetFile?: (
    filePath: string,
    base64: string
  ) => { ok: true; path: string } | { ok: false; reason: 'error' }
  movePath?: (
    fromPath: string,
    toPath: string
  ) => { ok: true } | { ok: false; reason: 'error' }
  pathExists?: (targetPath: string) => boolean

  /** 文件夹回收站 */
  getTrashFolders: () => TrashFolderEntry[]
  saveTrashFolders: (entries: TrashFolderEntry[]) => void
}

declare global {
  interface Window {
    markflow: MarkFlowBridge
  }
}

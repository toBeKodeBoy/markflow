export interface ImportFolderImage {
  relPath: string
  base64: string
  mime: string
}

export interface ImportFolderFile {
  relativePath: string
  content: string
  images: ImportFolderImage[]
  /** Standalone image file in folder (not referenced from markdown) */
  standaloneImage?: ImportFolderImage
}

export interface ImportFolderScanResult {
  rootPath: string
  files: ImportFolderFile[]
}

export interface ImportFolderOptions {
  preserveStructure: boolean
  targetFolderId?: string
  onConflict: 'rename' | 'skip'
  importImages: boolean
  /** Clear all notes, folders and assets before import */
  replaceExisting: boolean
  /** null = import all; Set = only listed relative paths */
  selectedPaths: Set<string> | null
}

export interface ImportFolderProgress {
  current: number
  total: number
  path: string
}

export interface ImportFolderResult {
  imported: number
  skipped: number
  failed: Array<{ path: string; reason: string }>
  warnings: string[]
  foldersCreated: number
  imagesImported: number
  firstImportedNoteId?: string
}

export const DEFAULT_IMPORT_FOLDER_OPTIONS: ImportFolderOptions = {
  preserveStructure: true,
  onConflict: 'rename',
  importImages: true,
  replaceExisting: false,
  selectedPaths: null,
}

export const IMPORT_FOLDER_OPTIONS_KEY = 'markflow_import_folder_options'

export type PersistedImportFolderOptions = Pick<
  ImportFolderOptions,
  'preserveStructure' | 'onConflict' | 'importImages' | 'replaceExisting'
>

export const DEFAULT_PERSISTED_IMPORT_OPTIONS: PersistedImportFolderOptions = {
  preserveStructure: true,
  onConflict: 'rename',
  importImages: true,
  replaceExisting: false,
}

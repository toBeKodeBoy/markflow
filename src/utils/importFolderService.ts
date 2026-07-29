import type { Note, Folder } from '../types'
import type {
  ImportFolderOptions,
  ImportFolderProgress,
  ImportFolderResult,
  ImportFolderScanResult,
} from '../types/import'
import {
  compareImportRelativePaths,
  extractImportTitle,
  formatImportTextContent,
  getFilenameStem,
  getBasename,
  getRelativeDir,
  getOrCreateTitleSet,
  isBlankContent,
  normalizeRelativePath,
  resolveUniqueTitle,
  ensureFolderForPath,
} from './importFolderHelpers'
import { importMarkdownImages } from './importMarkdownImages'

/** 每批写入 storage 的笔记数 */
export const IMPORT_COMMIT_BATCH_SIZE = 50
/** 每隔多少个文件 yield 一次，让出主线程 */
export const IMPORT_YIELD_INTERVAL = 10

export interface FolderImportDeps {
  getFolderList: () => Folder[]
  getExistingNotes?: () => Array<Pick<Note, 'folderId' | 'sortOrder'>>
  saveFolderList: (folders: Folder[]) => void
  saveNote: (note: Note) => void
  /** 批量写笔记（可选）；缺省时 fallback 为逐条 saveNote */
  saveNoteBatch?: (notes: Note[]) => void
  /** 一批笔记成功提交后回调（用于增量更新 UI） */
  onNotesCommitted?: (notes: Note[]) => void
  getExistingTitlesByFolder: () => Map<string, Set<string>>
  saveImageFromBase64: (base64: string, mime: string, filename?: string) => Promise<string>
  removeNote?: (id: string) => void
  removeAsset?: (id: string) => void | Promise<void>
  onProgress?: (progress: ImportFolderProgress) => void
  /** 测试可覆盖默认批次大小 */
  commitBatchSize?: number
  /** 测试可覆盖默认 yield 间隔 */
  yieldInterval?: number
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function filterSelectedFiles(
  scan: ImportFolderScanResult,
  selectedPaths: Set<string> | null
): ImportFolderScanResult['files'] {
  const files = scan.files.map((f) => ({
    ...f,
    relativePath: normalizeRelativePath(f.relativePath),
  }))
  if (!selectedPaths) return [...files].sort((a, b) => compareImportRelativePaths(a.relativePath, b.relativePath))
  const normalizedSelected = new Set(
    [...selectedPaths].map((p) => normalizeRelativePath(p))
  )
  return files
    .filter((f) => normalizedSelected.has(f.relativePath))
    .sort((a, b) => compareImportRelativePaths(a.relativePath, b.relativePath))
}

function getImportRootFolderName(rootPath: string): string {
  const normalized = normalizeRelativePath(rootPath).replace(/\/+$/, '')
  if (!normalized) return 'import'
  return getBasename(normalized) || normalized
}

function ensureImportRootFolder(
  scan: ImportFolderScanResult,
  folders: Folder[],
  nextFolderOrderByParent: Map<string, number>
): string {
  const rootName = getImportRootFolderName(scan.rootPath)
  const existing = folders.find((f) => f.name === rootName && f.parentId === undefined)
  if (existing) return existing.id

  const folder: Folder = {
    id: generateId(),
    name: rootName,
    order: nextSiblingImportOrder(nextFolderOrderByParent, undefined),
  }
  folders.push(folder)
  return folder.id
}

async function importImagesForFile(
  file: ImportFolderScanResult['files'][number],
  importImages: boolean,
  saveImageFromBase64: FolderImportDeps['saveImageFromBase64'],
  createdAssetIds: string[]
): Promise<{ content: string; imported: number; warnings: string[] }> {
  if (!importImages || file.images.length === 0) {
    return { content: file.content, imported: 0, warnings: [] }
  }

  const createdAssetCountBefore = createdAssetIds.length
  const result = await importMarkdownImages(file.content, file.images, async (base64, mime, filename) => {
    const assetId = await saveImageFromBase64(base64, mime, filename)
    createdAssetIds.push(assetId)
    return assetId
  })

  return {
    content: result.content,
    imported: createdAssetIds.length - createdAssetCountBefore,
    warnings: result.warnings,
  }
}

async function importStandaloneImageNote(
  file: ImportFolderScanResult['files'][number],
  saveImageFromBase64: FolderImportDeps['saveImageFromBase64'],
  createdAssetIds: string[]
): Promise<{ content: string; imported: number; warnings: string[] }> {
  const img = file.standaloneImage
  if (!img) return { content: '', imported: 0, warnings: [] }

  const filename = getBasename(file.relativePath)
  const title = getFilenameStem(file.relativePath)
  const warnings: string[] = []

  try {
    const assetId = await saveImageFromBase64(img.base64, img.mime, filename)
    createdAssetIds.push(assetId)
    return {
      content: `# ${title}\n\n![${filename}](markflow-asset://${assetId})\n`,
      imported: 1,
      warnings,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    warnings.push(`图片导入失败 ${filename}: ${msg}`)
    return {
      content: `# ${title}\n\n> 图片导入失败：${filename}\n`,
      imported: 0,
      warnings,
    }
  }
}

async function rollbackBatch(
  deps: FolderImportDeps,
  batchNotes: Note[],
  batchAssetIds: string[],
  folders: Folder[],
  foldersAtLastCommit: Folder[],
  lastSavedFolderCount: { value: number },
  titlesByFolder: Map<string, Set<string>>
): Promise<void> {
  if (deps.removeNote) {
    for (const note of batchNotes) {
      deps.removeNote(note.id)
    }
  }
  for (const note of batchNotes) {
    getOrCreateTitleSet(titlesByFolder, note.folderId).delete(note.title)
  }
  // 恢复到上一成功提交时的文件夹快照，避免失败批次留下空文件夹
  const restored = foldersAtLastCommit.map((f) => ({ ...f }))
  folders.splice(0, folders.length, ...restored)
  lastSavedFolderCount.value = folders.length
  deps.saveFolderList(restored)
  if (deps.removeAsset) {
    for (const id of batchAssetIds) {
      await deps.removeAsset(id)
    }
  }
}

async function flushPending(params: {
  deps: FolderImportDeps
  pendingNotes: Note[]
  uncommittedAssetIds: string[]
  folders: Folder[]
  foldersAtLastCommit: { value: Folder[] }
  initialFolderCount: number
  lastSavedFolderCount: { value: number }
  titlesByFolder: Map<string, Set<string>>
  result: ImportFolderResult
}): Promise<void> {
  const {
    deps,
    pendingNotes,
    uncommittedAssetIds,
    folders,
    foldersAtLastCommit,
    initialFolderCount,
    lastSavedFolderCount,
    titlesByFolder,
    result,
  } = params

  if (pendingNotes.length === 0) return

  const batch = pendingNotes.splice(0, pendingNotes.length)
  const batchAssets = uncommittedAssetIds.splice(0, uncommittedAssetIds.length)

  try {
    if (folders.length !== lastSavedFolderCount.value) {
      deps.saveFolderList(folders)
      lastSavedFolderCount.value = folders.length
      result.foldersCreated = Math.max(0, folders.length - initialFolderCount)
    }

    if (deps.saveNoteBatch) {
      deps.saveNoteBatch(batch)
    } else {
      for (const note of batch) {
        deps.saveNote(note)
      }
    }

    deps.onNotesCommitted?.(batch)
    result.imported += batch.length
    if (!result.firstImportedNoteId && batch[0]) {
      result.firstImportedNoteId = batch[0].id
    }
    foldersAtLastCommit.value = folders.map((f) => ({ ...f }))
  } catch (err) {
    await rollbackBatch(
      deps,
      batch,
      batchAssets,
      folders,
      foldersAtLastCommit.value,
      lastSavedFolderCount,
      titlesByFolder
    )
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(`导入提交失败，已回滚当前批次：${reason}`)
  }
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/** Batch import markdown files from a folder scan result（边处理边提交） */
export async function runFolderImport(
  scan: ImportFolderScanResult,
  options: ImportFolderOptions,
  deps: FolderImportDeps
): Promise<ImportFolderResult> {
  const files = filterSelectedFiles(scan, options.selectedPaths)
  const commitBatchSize = deps.commitBatchSize ?? IMPORT_COMMIT_BATCH_SIZE
  const yieldInterval = deps.yieldInterval ?? IMPORT_YIELD_INTERVAL

  const result: ImportFolderResult = {
    imported: 0,
    skipped: 0,
    failed: [],
    warnings: [],
    foldersCreated: 0,
    imagesImported: 0,
  }

  const folders = [...deps.getFolderList()]
  const foldersAtLastCommit = { value: folders.map((f) => ({ ...f })) }
  const initialFolderCount = folders.length
  const lastSavedFolderCount = { value: initialFolderCount }
  const titlesByFolder = deps.getExistingTitlesByFolder()
  const existingNotes = deps.getExistingNotes?.() ?? []
  const total = files.length
  const pendingNotes: Note[] = []
  const uncommittedAssetIds: string[] = []
  const nextFolderOrderByParent = new Map<string, number>()
  const nextNoteOrderByFolder = new Map<string, number>()

  for (const folder of folders) {
    const key = folder.parentId ?? '__root__'
    nextFolderOrderByParent.set(key, Math.max(nextFolderOrderByParent.get(key) ?? 0, folder.order + 1))
  }
  seedNextNoteOrderByFolder(nextNoteOrderByFolder, existingNotes)
  // 延迟创建根文件夹，避免无笔记导入时产生孤立文件夹
  let importRootFolderId: string | undefined

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    deps.onProgress?.({ current: i + 1, total, path: file.relativePath })

    const isStandaloneImage = !!file.standaloneImage
    if (!isStandaloneImage && isBlankContent(file.content)) {
      result.skipped++
      continue
    }
    if (isStandaloneImage && !options.importImages) {
      result.skipped++
      continue
    }

    try {
      let title = isStandaloneImage
        ? getFilenameStem(file.relativePath)
        : extractImportTitle(file.content, file.relativePath)

      let folderId: string | undefined
      if (options.preserveStructure) {
        if (importRootFolderId === undefined) {
          importRootFolderId = ensureImportRootFolder(scan, folders, nextFolderOrderByParent)
        }
        const dir = getRelativeDir(file.relativePath)
        folderId = dir
          ? ensureFolderForPath(
              dir,
              folders,
              (name, parentId) => ({
                id: generateId(),
                name,
                order: nextSiblingImportOrder(nextFolderOrderByParent, parentId),
                parentId,
              }),
              importRootFolderId
            )
          : importRootFolderId
      } else {
        folderId = options.targetFolderId
      }

      const folderTitles = getOrCreateTitleSet(titlesByFolder, folderId)
      const uniqueTitle = resolveUniqueTitle(title, folderTitles, options.onConflict)
      if (uniqueTitle === null) {
        result.skipped++
        continue
      }
      title = uniqueTitle
      folderTitles.add(title)

      let content: string
      let imported: number
      let warnings: string[]

      if (isStandaloneImage) {
        ;({ content, imported, warnings } = await importStandaloneImageNote(
          file,
          deps.saveImageFromBase64,
          uncommittedAssetIds
        ))
      } else {
        ;({ content, imported, warnings } = await importImagesForFile(
          file,
          options.importImages,
          deps.saveImageFromBase64,
          uncommittedAssetIds
        ))
        content = formatImportTextContent(content, file.relativePath)
      }

      result.imagesImported += imported
      result.warnings.push(...warnings)

      const now = Date.now()
      const note: Note = {
        id: generateId(),
        title,
        content,
        folderId,
        sortOrder: nextImportedNoteSortOrder(nextNoteOrderByFolder, folderId),
        importSourcePath: file.relativePath.replace(/\\/g, '/'),
        titleLockedFromSource: true,
        createdAt: now,
        updatedAt: now,
      }
      pendingNotes.push(note)
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      result.failed.push({ path: file.relativePath, reason })
    }

    if ((i + 1) % yieldInterval === 0) {
      await yieldToUi()
    }

    if (pendingNotes.length >= commitBatchSize) {
      await flushPending({
        deps,
        pendingNotes,
        uncommittedAssetIds,
        folders,
        foldersAtLastCommit,
        initialFolderCount,
        lastSavedFolderCount,
        titlesByFolder,
        result,
      })
      deps.onProgress?.({ current: i + 1, total, path: file.relativePath })
    }
  }

  if (pendingNotes.length > 0) {
    await flushPending({
      deps,
      pendingNotes,
      uncommittedAssetIds,
      folders,
      foldersAtLastCommit,
      initialFolderCount,
      lastSavedFolderCount,
      titlesByFolder,
      result,
    })
  }

  return result
}

function nextSiblingImportOrder(nextOrderByParent: Map<string, number>, parentId?: string): number {
  const key = parentId ?? '__root__'
  const next = nextOrderByParent.get(key) ?? 0
  nextOrderByParent.set(key, next + 1)
  return next
}

function nextImportedNoteSortOrder(nextOrderByFolder: Map<string, number>, folderId?: string): number {
  const key = folderId ?? '__root__'
  const next = nextOrderByFolder.get(key) ?? 100
  nextOrderByFolder.set(key, next + 100)
  return next
}

function seedNextNoteOrderByFolder(
  nextOrderByFolder: Map<string, number>,
  notes: Array<Pick<Note, 'folderId' | 'sortOrder'>>
): void {
  for (const note of notes) {
    const key = note.folderId ?? '__root__'
    const next = note.sortOrder != null ? note.sortOrder + 100 : 100
    nextOrderByFolder.set(key, Math.max(nextOrderByFolder.get(key) ?? 100, next))
  }
}

/** Save image bytes as internal asset, return asset id */
export async function saveImportImageAsAsset(
  base64: string,
  mime: string,
  filename: string | undefined,
  saveFromBlob: (blob: Blob, filename?: string) => Promise<string>
): Promise<string> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: mime })
  return saveFromBlob(blob, filename)
}

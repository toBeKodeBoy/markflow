import type { Note, Folder } from '../types'
import type {
  ImportFolderOptions,
  ImportFolderProgress,
  ImportFolderResult,
  ImportFolderScanResult,
} from '../types/import'
import {
  extractImportTitle,
  formatImportTextContent,
  getFilenameStem,
  getBasename,
  getRelativeDir,
  isBlankContent,
  normalizeRelativePath,
  resolveUniqueTitle,
  ensureFolderForPath,
} from './importFolderHelpers'
import { importMarkdownImages } from './importMarkdownImages'

export interface FolderImportDeps {
  getFolderList: () => Folder[]
  saveFolderList: (folders: Folder[]) => void
  saveNote: (note: Note) => void
  getExistingTitles: () => Set<string>
  saveImageFromBase64: (base64: string, mime: string, filename?: string) => Promise<string>
  removeNote?: (id: string) => void
  removeAsset?: (id: string) => void | Promise<void>
  onProgress?: (progress: ImportFolderProgress) => void
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
  if (!selectedPaths) return files
  const normalizedSelected = new Set(
    [...selectedPaths].map((p) => normalizeRelativePath(p))
  )
  return files.filter((f) => normalizedSelected.has(f.relativePath))
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

async function rollbackImport(
  deps: FolderImportDeps,
  folderSnapshot: Folder[],
  pendingNotes: Note[],
  createdAssetIds: string[]
): Promise<void> {
  if (deps.removeNote) {
    for (const note of pendingNotes) {
      deps.removeNote(note.id)
    }
  }
  deps.saveFolderList(folderSnapshot)
  if (deps.removeAsset) {
    for (const id of createdAssetIds) {
      await deps.removeAsset(id)
    }
  }
}

/** Batch import markdown files from a folder scan result (atomic commit) */
export async function runFolderImport(
  scan: ImportFolderScanResult,
  options: ImportFolderOptions,
  deps: FolderImportDeps
): Promise<ImportFolderResult> {
  const files = filterSelectedFiles(scan, options.selectedPaths)
  const result: ImportFolderResult = {
    imported: 0,
    skipped: 0,
    failed: [],
    warnings: [],
    foldersCreated: 0,
    imagesImported: 0,
  }

  const folders = [...deps.getFolderList()]
  const folderSnapshot = folders.map((f) => ({ ...f }))
  const initialFolderCount = folders.length
  const existingTitles = deps.getExistingTitles()
  const total = files.length
  const pendingNotes: Note[] = []
  const createdAssetIds: string[] = []

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
      const uniqueTitle = resolveUniqueTitle(title, existingTitles, options.onConflict)
      if (uniqueTitle === null) {
        result.skipped++
        continue
      }
      title = uniqueTitle
      existingTitles.add(title)

      let folderId: string | undefined
      if (options.preserveStructure) {
        const dir = getRelativeDir(file.relativePath)
        if (dir) {
          folderId = ensureFolderForPath(dir, folders, (name, parentId) => ({
            id: generateId(),
            name,
            order: folders.length,
            parentId,
          }))
        }
      } else {
        folderId = options.targetFolderId
      }

      let content: string
      let imported: number
      let warnings: string[]

      if (isStandaloneImage) {
        ;({ content, imported, warnings } = await importStandaloneImageNote(
          file,
          deps.saveImageFromBase64,
          createdAssetIds
        ))
      } else {
        ;({ content, imported, warnings } = await importImagesForFile(
          file,
          options.importImages,
          deps.saveImageFromBase64,
          createdAssetIds
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
        tags: [],
        importSourcePath: file.relativePath.replace(/\\/g, '/'),
        createdAt: now,
        updatedAt: now,
      }
      pendingNotes.push(note)
      result.imported++
      if (!result.firstImportedNoteId) result.firstImportedNoteId = note.id
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      result.failed.push({ path: file.relativePath, reason })
    }
  }

  if (pendingNotes.length === 0) {
    return result
  }

  try {
    if (folders.length > initialFolderCount) {
      deps.saveFolderList(folders)
      result.foldersCreated = folders.length - initialFolderCount
    }
    for (const note of pendingNotes) {
      deps.saveNote(note)
    }
  } catch (err) {
    await rollbackImport(deps, folderSnapshot, pendingNotes, createdAssetIds)
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(`导入提交失败，已回滚：${reason}`)
  }

  return result
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

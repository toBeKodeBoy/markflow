import { getAssetStorage } from '../composables/useAssetStorage'
import type { AssetRecord, ImageExportSettings } from '../types'
import { ASSET_IMAGE_MD_RE } from './assetUri'
import { buildAssetFilename, resolveDuplicateFilename } from './exportAssetFilename'
import { resolveImageExportTarget } from './imageExportPath'

const REMOTE_IMAGE_MD_RE = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g

export const DEFAULT_IMAGE_EXPORT_SETTINGS: ImageExportSettings = {
  mode: 'note-assets-folder',
  customTemplate: './${filename}.assets',
  fileNameTemplate: '${filename}-${index}',
  overwriteStrategy: 'rename',
  bindNoteOnExport: true,
  downloadRemoteImages: true,
  syncUnusedAssets: true,
  unusedAssetsFolderName: '_unused',
}

export interface ExportMarkdownAssetsOptions {
  markdown: string
  markdownFilePath: string
  noteTitle: string
  settings: ImageExportSettings
  managedAssetIds?: string[]
}

export interface ExportMarkdownAssetsResult {
  markdown: string
  exportedCount: number
  syncedUnusedCount: number
  warnings: string[]
}

function joinWindowsPath(base: string, name: string): string {
  return `${base.replace(/[\\/]+$/, '')}\\${name.replace(/^[\\/]+/, '')}`
}

function toMarkdownPath(path: string): string {
  return path.replace(/\\/g, '/')
}

function dirname(path: string): string {
  const normalized = path.replace(/\//g, '\\')
  const idx = normalized.lastIndexOf('\\')
  return idx > 0 ? normalized.slice(0, idx) : normalized
}

function relativePath(fromDir: string, toPath: string): string {
  const from = fromDir.replace(/\//g, '\\').split('\\').filter(Boolean)
  const to = toPath.replace(/\//g, '\\').split('\\').filter(Boolean)
  let same = 0
  while (same < from.length && same < to.length && from[same] === to[same]) same += 1
  const up = new Array(from.length - same).fill('..')
  const down = to.slice(same)
  const joined = [...up, ...down].join('/')
  return joined.startsWith('.') ? joined : `./${joined}`
}

async function replaceAsync(
  input: string,
  regex: RegExp,
  replacer: (...args: string[]) => Promise<string>
): Promise<string> {
  const matches = [...input.matchAll(new RegExp(regex.source, 'g'))]
  if (matches.length === 0) return input
  let lastIndex = 0
  const chunks: string[] = []
  for (const match of matches) {
    const start = match.index ?? 0
    chunks.push(input.slice(lastIndex, start))
    chunks.push(await replacer(...(match as unknown as string[])))
    lastIndex = start + match[0].length
  }
  chunks.push(input.slice(lastIndex))
  return chunks.join('')
}

function buildMarkdownHref(
  markdownDir: string,
  assetDirAbsPath: string,
  fileName: string,
  pathStyle: 'absolute' | 'relative'
): string {
  const assetPath = joinWindowsPath(assetDirAbsPath, fileName)
  return pathStyle === 'absolute'
    ? toMarkdownPath(assetPath)
    : relativePath(markdownDir, assetPath)
}

function extractFilenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const last = parsed.pathname.split('/').filter(Boolean).pop()
    return last || 'remote-image'
  } catch {
    const parts = url.split('/').filter(Boolean)
    return parts[parts.length - 1] || 'remote-image'
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('读取远程图片失败'))
    reader.readAsDataURL(blob)
  })
}

async function exportSingleAsset(
  record: AssetRecord,
  index: number,
  options: ExportMarkdownAssetsOptions,
  usedNames: Set<string>,
  assetDirAbsPath: string
): Promise<{ fileName: string | null; warning?: string }> {
  const bridge = window.markflow
  const baseName = buildAssetFilename(
    record,
    options.noteTitle,
    index,
    options.settings.fileNameTemplate ?? DEFAULT_IMAGE_EXPORT_SETTINGS.fileNameTemplate
  )
  const fileName = resolveDuplicateFilename(
    baseName,
    usedNames,
    options.settings.overwriteStrategy ?? DEFAULT_IMAGE_EXPORT_SETTINGS.overwriteStrategy ?? 'rename'
  )
  if (!fileName) return { fileName: null, warning: `图片已跳过：${baseName}` }
  const result = bridge.writeAssetFile?.(joinWindowsPath(assetDirAbsPath, fileName), record.data)
  if (!result?.ok) return { fileName: null, warning: `图片导出失败：${record.meta.id}` }
  return { fileName }
}

async function downloadRemoteImage(
  imageUrl: string,
  order: number,
  options: ExportMarkdownAssetsOptions,
  usedNames: Set<string>,
  assetDirAbsPath: string
): Promise<{ fileName: string | null; warning?: string }> {
  let response: Response
  try {
    response = await fetch(imageUrl)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { fileName: null, warning: `外链图片下载失败：${imageUrl}（${msg}）` }
  }
  if (!response.ok) {
    return { fileName: null, warning: `外链图片下载失败：${imageUrl}（HTTP ${response.status}）` }
  }

  const blob = await response.blob()
  const mimeType = response.headers.get('content-type') || blob.type || 'image/png'
  const data = await blobToBase64(blob)
  const record: AssetRecord = {
    meta: {
      id: `remote-${order}`,
      mimeType,
      size: blob.size,
      filename: extractFilenameFromUrl(imageUrl),
      createdAt: Date.now(),
    },
    data,
  }
  return exportSingleAsset(record, order, options, usedNames, assetDirAbsPath)
}

function collectReferencedAssetIds(markdown: string): Set<string> {
  const ids = new Set<string>()
  const re = new RegExp(ASSET_IMAGE_MD_RE.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(markdown)) !== null) {
    if (match[2]) ids.add(match[2])
  }
  return ids
}

async function exportUnusedAssets(
  options: ExportMarkdownAssetsOptions,
  assetDirAbsPath: string,
  storage: ReturnType<typeof getAssetStorage>,
  referencedIds: Set<string>,
  usedNames: Set<string>
): Promise<{ syncedUnusedCount: number; warnings: string[] }> {
  if (options.settings.syncUnusedAssets === false) {
    return { syncedUnusedCount: 0, warnings: [] }
  }

  const managedIds = options.managedAssetIds ?? []
  const unusedIds = managedIds.filter((id) => !referencedIds.has(id))
  if (unusedIds.length === 0) {
    return { syncedUnusedCount: 0, warnings: [] }
  }

  const unusedFolder = options.settings.unusedAssetsFolderName || DEFAULT_IMAGE_EXPORT_SETTINGS.unusedAssetsFolderName || '_unused'
  const unusedDir = joinWindowsPath(assetDirAbsPath, unusedFolder)
  const ensure = window.markflow.ensureDirectory?.(unusedDir)
  if (!ensure?.ok) throw new Error('未引用图片目录创建失败')

  const warnings: string[] = []
  let syncedUnusedCount = 0
  let order = 0

  for (const id of unusedIds) {
    order += 1
    const record = await storage.getAssetAsync(id)
    if (!record) {
      warnings.push(`未找到未引用图片资源：${id}`)
      continue
    }
    const exported = await exportSingleAsset(record, order, options, usedNames, unusedDir)
    if (!exported.fileName) {
      if (exported.warning) warnings.push(exported.warning)
      continue
    }
    syncedUnusedCount += 1
  }

  return { syncedUnusedCount, warnings }
}

export async function exportMarkdownAssets(
  options: ExportMarkdownAssetsOptions
): Promise<ExportMarkdownAssetsResult> {
  const bridge = window.markflow
  if (!bridge?.ensureDirectory || !bridge.writeAssetFile) {
    return {
      markdown: options.markdown,
      exportedCount: 0,
      syncedUnusedCount: 0,
      warnings: ['当前环境不支持导出图片文件'],
    }
  }

  const target = resolveImageExportTarget({
    markdownFilePath: options.markdownFilePath,
    noteTitle: options.noteTitle,
    mode: options.settings.mode,
    customTemplate: options.settings.customTemplate,
    typoraRootDir: options.settings.typoraRootDir,
  })
  const ensure = bridge.ensureDirectory(target.assetDirAbsPath)
  if (!ensure.ok) throw new Error('图片目录创建失败')

  const storage = getAssetStorage()
  const warnings: string[] = []
  const usedNames = new Set<string>()
  const exportedById = new Map<string, string>()
  const markdownDir = dirname(options.markdownFilePath)
  const referencedIds = collectReferencedAssetIds(options.markdown)
  let order = 0
  let exportedCount = 0

  const internalRewritten = await replaceAsync(options.markdown, ASSET_IMAGE_MD_RE, async (match, alt, id) => {
    const existing = exportedById.get(id)
    if (existing) {
      const reusedHref = buildMarkdownHref(markdownDir, target.assetDirAbsPath, existing, target.markdownPathStyle)
      const reusedTitleMatch = match.match(/\s+"([^"]*)"\s*\)$/)
      const reusedTitleSuffix = reusedTitleMatch ? ` "${reusedTitleMatch[1]}"` : ''
      return `![${alt}](${reusedHref}${reusedTitleSuffix})`
    }

    order += 1
    const record = await storage.getAssetAsync(id)
    if (!record) {
      warnings.push(`未找到图片资源：${id}`)
      return match
    }
    const exported = await exportSingleAsset(record, order, options, usedNames, target.assetDirAbsPath)
    if (!exported.fileName) {
      if (exported.warning) warnings.push(exported.warning)
      return match
    }
    exportedCount += 1
    exportedById.set(id, exported.fileName)
    const href = buildMarkdownHref(markdownDir, target.assetDirAbsPath, exported.fileName, target.markdownPathStyle)
    const titleMatch = match.match(/\s+"([^"]*)"\s*\)$/)
    const titleSuffix = titleMatch ? ` "${titleMatch[1]}"` : ''
    return `![${alt}](${href}${titleSuffix})`
  })

  const markdown =
    options.settings.downloadRemoteImages === false
      ? internalRewritten
      : await replaceAsync(internalRewritten, REMOTE_IMAGE_MD_RE, async (match, alt, imageUrl) => {
          order += 1
          const downloaded = await downloadRemoteImage(
            imageUrl,
            order,
            options,
            usedNames,
            target.assetDirAbsPath
          )
          if (!downloaded.fileName) {
            if (downloaded.warning) warnings.push(downloaded.warning)
            return match
          }
          exportedCount += 1
          const href = buildMarkdownHref(
            markdownDir,
            target.assetDirAbsPath,
            downloaded.fileName,
            target.markdownPathStyle
          )
          const titleMatch = match.match(/\s+"([^"]*)"\s*\)$/)
          const titleSuffix = titleMatch ? ` "${titleMatch[1]}"` : ''
          return `![${alt}](${href}${titleSuffix})`
        })

  const unused = await exportUnusedAssets(options, target.assetDirAbsPath, storage, referencedIds, usedNames)
  warnings.push(...unused.warnings)

  return {
    markdown,
    exportedCount,
    syncedUnusedCount: unused.syncedUnusedCount,
    warnings,
  }
}

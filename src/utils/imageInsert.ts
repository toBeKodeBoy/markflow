import { getAssetStorage } from '../composables/useAssetStorage'
import { useNoteStore } from '../stores/note'
import { buildAssetMarkdown } from './assetUri'
import { blobToBase64, compressImage } from './imageCompress'
import { showAppNotification } from './notify'

export function getImageFileFromDataTransfer(dt: DataTransfer): File | null {
  const items = dt.items
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        return item.getAsFile()
      }
    }
  }
  const files = dt.files
  if (files) {
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('image/')) return files[i]
    }
  }
  return null
}

export async function saveImageAsMarkdown(file: File): Promise<string> {
  const noteStore = useNoteStore()
  const note = noteStore.currentNote
  if (
    note?.assetPathMode === 'file-bound'
    && note.workingFilePath
    && note.assetDirectoryPath
    && window.markflow?.ensureDirectory
    && window.markflow?.writeAssetFile
  ) {
    return saveImageAsFileMarkdown(file, {
      workingFilePath: note.workingFilePath,
      assetDirectoryPath: note.assetDirectoryPath,
      assetLinkStyle: note.assetLinkStyle ?? 'relative',
    })
  }

  const storage = getAssetStorage()
  const assetId = await storage.saveFromFile(file)
  const alt = file.name.replace(/\.[^.]+$/, '') || '图片'
  return buildAssetMarkdown(alt, assetId)
}

export async function handleImageInsert(
  file: File,
  insert: (markdown: string) => void
): Promise<boolean> {
  try {
    const markdown = await saveImageAsMarkdown(file)
    insert(markdown)
    return true
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    showAppNotification(msg)
    return false
  }
}

function splitFileName(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return { base: name || 'image', ext: '.png' }
  return { base: name.slice(0, dot), ext: name.slice(dot) }
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

function joinWindowsPath(base: string, name: string): string {
  return `${base.replace(/[\\/]+$/, '')}\\${name.replace(/^[\\/]+/, '')}`
}

async function saveImageAsFileMarkdown(
  file: File,
  binding: {
    workingFilePath: string
    assetDirectoryPath: string
    assetLinkStyle: 'absolute' | 'relative'
  }
): Promise<string> {
  const bridge = window.markflow
  const ensure = bridge.ensureDirectory?.(binding.assetDirectoryPath)
  if (!ensure?.ok) throw new Error('图片目录创建失败')

  const compressed = await compressImage(file)
  const base64 = await blobToBase64(compressed.blob)
  const alt = file.name.replace(/\.[^.]+$/, '') || '图片'
  const defaultExt = compressed.mimeType === 'image/jpeg' ? '.jpg' : '.png'
  const { base, ext } = splitFileName(file.name || `image${defaultExt}`)

  let index = 1
  let filename = `${base}-${index}${ext || defaultExt}`
  let fullPath = joinWindowsPath(binding.assetDirectoryPath, filename)
  while (bridge.pathExists?.(fullPath)) {
    index += 1
    filename = `${base}-${index}${ext || defaultExt}`
    fullPath = joinWindowsPath(binding.assetDirectoryPath, filename)
  }

  const writeResult = bridge.writeAssetFile?.(fullPath, base64)
  if (!writeResult?.ok) throw new Error('图片写入本地失败')

  const href =
    binding.assetLinkStyle === 'absolute'
      ? toMarkdownPath(fullPath)
      : relativePath(dirname(binding.workingFilePath), fullPath)

  return `![${alt}](${href})`
}

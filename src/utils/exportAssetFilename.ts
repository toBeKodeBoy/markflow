import type { AssetRecord, ImageExportOverwriteStrategy } from '../types'
import { sanitizeFilename } from './exportPdf'
import { renderPathTemplate } from './pathTemplate'

const MIME_EXT_MAP: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'image/bmp': '.bmp',
  'image/x-icon': '.ico',
}

function extFromRecord(record: AssetRecord): string {
  const filename = record.meta.filename ?? ''
  const dot = filename.lastIndexOf('.')
  if (dot >= 0) return filename.slice(dot)
  return MIME_EXT_MAP[record.meta.mimeType] ?? '.img'
}

function baseNameFromRecord(record: AssetRecord, noteTitle: string, index: number): string {
  const filename = record.meta.filename ?? ''
  const dot = filename.lastIndexOf('.')
  const raw = dot > 0 ? filename.slice(0, dot) : filename
  return sanitizeFilename(raw || noteTitle || `image-${index}`)
}

export function buildAssetFilename(
  record: AssetRecord,
  noteTitle: string,
  index: number,
  template = '${filename}-${index}'
): string {
  const base = renderPathTemplate(template, {
    filename: baseNameFromRecord(record, noteTitle, index),
    noteTitle,
    date: new Date(record.meta.createdAt).toISOString().slice(0, 10),
    time: new Date(record.meta.createdAt).toTimeString().slice(0, 8).replace(/:/g, ''),
    index: String(index),
  }).trim()
  return `${sanitizeFilename(base || `image-${index}`)}${extFromRecord(record)}`
}

export function resolveDuplicateFilename(
  filename: string,
  usedNames: Set<string>,
  strategy: ImageExportOverwriteStrategy
): string | null {
  if (!usedNames.has(filename) || strategy === 'overwrite') {
    usedNames.add(filename)
    return filename
  }
  if (strategy === 'skip') {
    return null
  }
  const dot = filename.lastIndexOf('.')
  const base = dot >= 0 ? filename.slice(0, dot) : filename
  const ext = dot >= 0 ? filename.slice(dot) : ''
  let counter = 2
  let candidate = `${base}-${counter}${ext}`
  while (usedNames.has(candidate)) {
    counter += 1
    candidate = `${base}-${counter}${ext}`
  }
  usedNames.add(candidate)
  return candidate
}

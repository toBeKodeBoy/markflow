import type { Folder } from '../types'

const TITLE_SCAN_LINES = 50
const SKIP_DIR_NAMES = new Set(['.git', 'node_modules', '.svn', '__pycache__', '.idea', 'dist', 'build'])

const TEXT_IMPORT_EXT = new Set([
  'md', 'markdown', 'mdown', 'mkd', 'txt', 'text',
  'json', 'jsonc', 'yaml', 'yml', 'toml', 'xml', 'html', 'htm', 'css', 'scss', 'sass', 'less',
  'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'vue', 'svelte',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'kts', 'swift', 'c', 'cpp', 'cc', 'h', 'hpp', 'cs',
  'sql', 'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd',
  'ini', 'cfg', 'conf', 'env', 'properties',
  'log', 'csv', 'tsv',
  'adoc', 'asciidoc', 'org', 'tex', 'latex', 'bib', 'rst',
])

const IMAGE_IMPORT_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'])

const SKIP_IMPORT_EXT = new Set([
  'exe', 'dll', 'so', 'dylib', 'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'mp3', 'mp4', 'avi', 'mov', 'mkv', 'wav', 'flac', 'ogg', 'webm',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'bin', 'obj', 'o', 'class', 'jar', 'wasm', 'dmg', 'iso',
  'db', 'sqlite', 'sqlite3',
])

const TEXT_IMPORT_BASENAMES = new Set([
  'dockerfile', 'makefile', 'license', 'readme', 'changelog', 'authors', 'contributing',
])

const MARKDOWN_EXT = new Set(['md', 'markdown', 'mdown', 'mkd'])

const CODE_FENCE_LANG: Record<string, string> = {
  json: 'json', jsonc: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml', xml: 'xml',
  html: 'html', htm: 'html', css: 'css', scss: 'scss', sass: 'sass', less: 'less',
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
  vue: 'vue', svelte: 'svelte', py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
  java: 'java', kt: 'kotlin', kts: 'kotlin', swift: 'swift', c: 'c', cpp: 'cpp', cc: 'cpp',
  h: 'c', hpp: 'cpp', cs: 'csharp', sql: 'sql', sh: 'bash', bash: 'bash', zsh: 'bash',
  ps1: 'powershell', bat: 'batch', cmd: 'batch', ini: 'ini', log: 'log', csv: 'csv',
  adoc: 'asciidoc', asciidoc: 'asciidoc', org: 'org', tex: 'latex', latex: 'latex', bib: 'bib', rst: 'rst',
}

/** File extension from path (lowercase, no dot) */
export function getFileExtension(relativePath: string): string {
  const name = relativePath.slice(relativePath.lastIndexOf('/') + 1)
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return ''
  return name.slice(dot + 1).toLowerCase()
}

/** Basename without path */
export function getBasename(relativePath: string): string {
  return relativePath.slice(relativePath.lastIndexOf('/') + 1)
}

/** Normalize path separators to forward slashes */
export function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, '/')
}

/** Parent directory segment of a relative file path, or undefined at root */
export function getRelativeDir(relativePath: string): string | undefined {
  const normalized = normalizeRelativePath(relativePath)
  const idx = normalized.lastIndexOf('/')
  if (idx <= 0) return undefined
  return normalized.slice(0, idx)
}

/** Filename without extension */
export function getFilenameStem(relativePath: string): string {
  const normalized = normalizeRelativePath(relativePath)
  const name = normalized.slice(normalized.lastIndexOf('/') + 1)
  return name.replace(/\.[^.]+$/, '')
}

/** Whether directory name should be skipped during scan */
export function shouldSkipDirName(name: string): boolean {
  return SKIP_DIR_NAMES.has(name) || name.startsWith('.')
}

/** Whether filename should be skipped during folder import */
export function shouldSkipImportFilename(name: string): boolean {
  const ext = getFileExtension(name)
  if (ext && SKIP_IMPORT_EXT.has(ext)) return true
  return false
}

/** Whether filename is importable as a text note */
export function isImportableTextFilename(name: string): boolean {
  if (shouldSkipImportFilename(name)) return false
  const base = getBasename(name)
  const lower = base.toLowerCase()
  if (TEXT_IMPORT_BASENAMES.has(lower)) return true
  const ext = getFileExtension(name)
  if (!ext) return false
  return TEXT_IMPORT_EXT.has(ext)
}

/** Whether filename is a standalone importable image */
export function isImportableImageFilename(name: string): boolean {
  if (shouldSkipImportFilename(name)) return false
  return IMAGE_IMPORT_EXT.has(getFileExtension(name))
}

/** Whether filename can be imported (text note or standalone image) */
export function isImportableFilename(name: string): boolean {
  return isImportableTextFilename(name) || isImportableImageFilename(name)
}

/** @deprecated use isImportableTextFilename */
export function isMarkdownFilename(name: string): boolean {
  return isImportableTextFilename(name)
}

/** Wrap non-markdown text so it renders in the editor preview */
export function formatImportTextContent(content: string, relativePath: string): string {
  const ext = getFileExtension(relativePath)
  if (MARKDOWN_EXT.has(ext) || ext === 'txt' || ext === 'text') return content
  const stem = getFilenameStem(relativePath)
  const lang = CODE_FENCE_LANG[ext]
  if (lang) {
    const body = content.endsWith('\n') ? content.slice(0, -1) : content
    return `# ${stem}\n\n\`\`\`${lang}\n${body}\n\`\`\`\n`
  }
  return `# ${stem}\n\n${content}`
}

/** MIME type from image extension */
export function mimeFromImageExtension(relativePath: string): string {
  const ext = getFileExtension(relativePath)
  if (ext === 'jpg') return 'image/jpeg'
  if (ext === 'svg') return 'image/svg+xml'
  if (ext === 'ico') return 'image/x-icon'
  if (ext === 'bmp') return 'image/bmp'
  return `image/${ext}`
}

/** Whether file content is empty or whitespace-only */
export function isBlankContent(content: string): boolean {
  return !content.trim()
}

/** Extract note title for folder import — prefer filename stem over content headings */
export function extractImportTitle(content: string, relativePath: string): string {
  const stem = getFilenameStem(relativePath)
  if (stem) return stem

  let line = 0
  let start = 0
  while (line < TITLE_SCAN_LINES && start <= content.length) {
    const end = content.indexOf('\n', start)
    const lineEnd = end === -1 ? content.length : end
    const chunk = content.slice(start, lineEnd)
    const heading = chunk.match(/^#+\s+(.+)/)
    if (heading) return heading[1].trim()
    if (chunk.trim()) return chunk.trim().slice(0, 30)
    line++
    if (end === -1) break
    start = end + 1
  }
  return '无标题'
}

/** Find root-level folder by name (ignores nested folders with same name) */
export function findRootFolderByName(folders: Folder[], name: string): Folder | undefined {
  return folders.find((f) => f.name === name && f.parentId === undefined)
}

/** Resolve unique note title given existing titles */
export function resolveUniqueTitle(
  title: string,
  existing: Set<string>,
  onConflict: 'rename' | 'skip'
): string | null {
  if (!existing.has(title)) return title
  if (onConflict === 'skip') return null

  let n = 2
  while (existing.has(`${title} (${n})`)) n++
  return `${title} (${n})`
}

/** Find or create nested folders for a relative directory path */
export function ensureFolderForPath(
  dirPath: string,
  folders: Folder[],
  createFolder: (name: string, parentId?: string) => Folder
): string {
  const segments = normalizeRelativePath(dirPath).split('/').filter(Boolean)
  if (segments.length === 0) {
    throw new Error('ensureFolderForPath: empty dirPath')
  }

  let parentId: string | undefined
  for (const segment of segments) {
    const existing = folders.find((f) => f.name === segment && f.parentId === parentId)
    if (existing) {
      parentId = existing.id
      continue
    }
    const folder = createFolder(segment, parentId)
    folders.push(folder)
    parentId = folder.id
  }
  return parentId!
}

/** Relative image paths in markdown (excluding http/data/markflow-asset) */
export const RELATIVE_IMAGE_MD_RE =
  /!\[([^\]]*)\]\((?!https?:|markflow-asset:|data:)([^)\s]+)(?:\s+"[^"]*")?\)/g

/** Replace relative image paths with markflow-asset refs */
export function rewriteRelativeImages(
  content: string,
  pathToAssetId: Map<string, string>
): string {
  return content.replace(RELATIVE_IMAGE_MD_RE, (match, alt: string, relPath: string) => {
    const normalized = relPath.trim().replace(/^<|>$/g, '')
    const assetId = pathToAssetId.get(normalized)
    if (!assetId) return match
    const titleMatch = match.match(/\s+"([^"]*)"\s*\)$/)
    const titleSuffix = titleMatch ? ` "${titleMatch[1]}"` : ''
    return `![${alt}](markflow-asset://${assetId}${titleSuffix})`
  })
}

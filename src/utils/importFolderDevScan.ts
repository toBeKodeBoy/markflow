import type { ImportFolderFile, ImportFolderScanResult } from '../types/import'
import {
  isImportableTextFilename,
  isImportableImageFilename,
  getBasename,
  mimeFromImageExtension,
  normalizeRelativePath,
  RELATIVE_IMAGE_MD_RE,
} from './importFolderHelpers'

/** Strip top-level folder name from webkitRelativePath */
export function normalizeDevRelativePath(webkitRelativePath: string): string {
  const normalized = normalizeRelativePath(webkitRelativePath)
  const parts = normalized.split('/')
  if (parts.length > 1) parts.shift()
  return parts.join('/')
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1] ?? ''
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

/** Build scan result from browser FileList (webkitdirectory) */
export async function scanFilesFromFileList(fileList: FileList): Promise<ImportFolderScanResult> {
  const allFiles = Array.from(fileList)
  const pathMap = new Map<string, File>()

  for (const file of allFiles) {
    const rel = normalizeDevRelativePath(file.webkitRelativePath || file.name)
    pathMap.set(rel, file)
    pathMap.set('./' + rel, file)
  }

  const importableFiles = allFiles.filter(
    (f) => isImportableTextFilename(f.name) || isImportableImageFilename(f.name)
  )
  const files: ImportFolderFile[] = []

  for (const file of importableFiles) {
    const relativePath = normalizeDevRelativePath(file.webkitRelativePath || file.name)

    if (isImportableImageFilename(file.name)) {
      files.push({
        relativePath,
        content: '',
        images: [],
        standaloneImage: {
          relPath: getBasename(relativePath),
          base64: await readFileAsBase64(file),
          mime: file.type || mimeFromImageExtension(relativePath),
        },
      })
      continue
    }

    const content = await file.text()
    const images: ImportFolderFile['images'] = []

    const re = new RegExp(RELATIVE_IMAGE_MD_RE.source, 'g')
    let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) {
      const relImg = m[2].trim().replace(/^<|>$/g, '')
      const mdDir = relativePath.includes('/')
        ? relativePath.slice(0, relativePath.lastIndexOf('/'))
        : ''
      const imgRel = normalizeRelativePath(
        mdDir ? `${mdDir}/${relImg.replace(/^\.\//, '')}` : relImg.replace(/^\.\//, '')
      )
      const imgFile = pathMap.get(imgRel) ?? pathMap.get('./' + imgRel) ?? pathMap.get(relImg)
      if (imgFile && imgFile.type.startsWith('image/')) {
        images.push({
          relPath: relImg,
          base64: await readFileAsBase64(imgFile),
          mime: imgFile.type,
        })
      }
    }

    files.push({ relativePath, content, images })
  }

  const rootName = allFiles[0]?.webkitRelativePath?.split('/')[0] ?? 'import'
  return { rootPath: rootName, files }
}

/** Open folder picker in browser dev environment */
export function pickDevFolderScan(): Promise<ImportFolderScanResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.webkitdirectory = true
    input.multiple = true
    input.onchange = async () => {
      const list = input.files
      if (!list?.length) {
        resolve(null)
        return
      }
      resolve(await scanFilesFromFileList(list))
    }
    input.click()
  })
}

/** Pick folder scan in uTools or browser */
export async function pickFolderScan(): Promise<ImportFolderScanResult | null> {
  if (typeof window.markflow !== 'undefined' && window.markflow.openMarkdownFolder) {
    return window.markflow.openMarkdownFolder()
  }
  return pickDevFolderScan()
}
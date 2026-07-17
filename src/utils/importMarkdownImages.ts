import type { ImportFolderImage } from '../types/import'
import { rewriteRelativeImages } from './importFolderHelpers'

export interface ImportMarkdownImagesResult {
  content: string
  imagesImported: number
  warnings: string[]
}

type SaveImageFromBase64 = (
  base64: string,
  mime: string,
  filename?: string
) => Promise<string>

function normalizeImagePath(relPath: string): string {
  return relPath.trim().replace(/^<|>$/g, '')
}

function addPathAliases(pathToAssetId: Map<string, string>, relPath: string, assetId: string): void {
  pathToAssetId.set(relPath, assetId)

  if (relPath.startsWith('./')) {
    pathToAssetId.set(relPath.slice(2), assetId)
    return
  }

  pathToAssetId.set(`./${relPath}`, assetId)
}

export async function importMarkdownImages(
  content: string,
  images: ImportFolderImage[],
  saveImageFromBase64: SaveImageFromBase64
): Promise<ImportMarkdownImagesResult> {
  if (images.length === 0) {
    return { content, imagesImported: 0, warnings: [] }
  }

  const pathToAssetId = new Map<string, string>()
  const warnings: string[] = []
  let imagesImported = 0

  for (const image of images) {
    const relPath = normalizeImagePath(image.relPath)
    if (pathToAssetId.has(relPath)) continue

    try {
      const assetId = await saveImageFromBase64(
        image.base64,
        image.mime,
        relPath.split('/').pop()
      )
      addPathAliases(pathToAssetId, relPath, assetId)
      imagesImported++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      warnings.push(`图片导入失败 ${relPath}: ${msg}`)
    }
  }

  return {
    content: rewriteRelativeImages(content, pathToAssetId),
    imagesImported,
    warnings,
  }
}

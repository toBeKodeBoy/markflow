import { getAssetStorage } from '../composables/useAssetStorage'
import { buildAssetMarkdown } from './assetUri'
import { showAppNotification } from './notify'

/** 从 DataTransfer 中取第一张图片文件 */
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

/** 保存图片并返回可插入编辑器的 Markdown 片段 */
export async function saveImageAsMarkdown(file: File): Promise<string> {
  const storage = getAssetStorage()
  const assetId = await storage.saveFromFile(file)
  const alt = file.name.replace(/\.[^.]+$/, '') || '图片'
  return buildAssetMarkdown(alt, assetId)
}

/** 粘贴/拖拽图片：保存 asset 并插入 Markdown，返回是否已处理 */
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

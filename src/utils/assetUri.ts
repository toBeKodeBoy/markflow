import type { AssetRecord } from '../types/asset'
import { DEFAULT_IMAGE_SCALE, formatScaleTitle, type ImageScale } from './imageScale'

export const ASSET_URI_PREFIX = 'markflow-asset://'

/** 匹配 ![alt](markflow-asset://id) 或带 title 的 ![alt](markflow-asset://id "title") */
export const ASSET_IMAGE_MD_RE =
  /!\[([^\]]*)\]\(markflow-asset:\/\/([^\s)]+)(?:\s+"[^"]*")?\)/g

/** 匹配 ![alt](data:image/...;base64,...) 可选 title */
export const DATA_IMAGE_MD_RE =
  /!\[([^\]]*)\]\(data:image\/[^;]+;base64,([^\s)]+)(?:\s+"[^"]*")?\)/g

/** 从正文中扫描 asset id */
export const ASSET_ID_SCAN_RE = /markflow-asset:\/\/([^\s")]+)/g

/** 生成唯一 asset ID */
export function generateAssetId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

/** 构建 Markdown 图片引用（持久化格式） */
export function buildAssetMarkdown(alt: string, assetId: string, scale?: ImageScale): string {
  const s = scale ?? DEFAULT_IMAGE_SCALE
  const titleAttr = s === DEFAULT_IMAGE_SCALE ? '' : ` "${formatScaleTitle(s)}"`
  return `![${alt}](${ASSET_URI_PREFIX}${assetId}${titleAttr})`
}

/** 从 asset URI 或带 title 的 href 提取 ID */
export function parseAssetId(uri: string): string | null {
  if (!uri.startsWith(ASSET_URI_PREFIX)) return null
  const rest = uri.slice(ASSET_URI_PREFIX.length).trim()
  const id = rest.split(/\s/)[0]?.replace(/^"+|"+$/g, '')
  return id || null
}

/** 将 AssetRecord 转为 data URL */
export function assetToDataUrl(record: AssetRecord): string {
  return `data:${record.meta.mimeType};base64,${record.data}`
}

/** 扫描 Markdown 中引用的 asset ID */
export function extractAssetIds(markdown: string): string[] {
  const ids = new Set<string>()
  let m: RegExpExecArray | null
  const re = new RegExp(ASSET_IMAGE_MD_RE.source, 'g')
  while ((m = re.exec(markdown)) !== null) {
    if (m[2]) ids.add(m[2])
  }
  return [...ids]
}

/** 渲染前：markflow-asset:// → data URL（保留 title） */
export function resolveAssetsInMarkdown(
  markdown: string,
  getDataUrl: (id: string) => string | null
): string {
  return markdown.replace(
    ASSET_IMAGE_MD_RE,
    (match, alt: string, id: string) => {
      const titleMatch = match.match(/\s+"([^"]*)"\s*\)$/)
      const titleSuffix = titleMatch ? ` "${titleMatch[1]}"` : ''
      const dataUrl = getDataUrl(id)
      return dataUrl ? `![${alt}](${dataUrl}${titleSuffix})` : match
    }
  )
}

/** 持久化前：data URL → markflow-asset://（保留 scale title） */
export function restoreAssetRefsInMarkdown(
  markdown: string,
  findIdByData: (base64: string) => string | null
): string {
  return markdown.replace(
    DATA_IMAGE_MD_RE,
    (match, alt: string, b64: string) => {
      const titleMatch = match.match(/\s+"([^"]*)"\s*\)$/)
      const titleSuffix = titleMatch ? ` "${titleMatch[1]}"` : ''
      const id = findIdByData(b64)
      return id ? `![${alt}](${ASSET_URI_PREFIX}${id}${titleSuffix})` : match
    }
  )
}

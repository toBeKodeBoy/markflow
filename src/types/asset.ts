export interface AssetMeta {
  id: string
  mimeType: string
  size: number
  width?: number
  height?: number
  filename?: string
  createdAt: number
}

export interface AssetRecord {
  meta: AssetMeta
  /** Base64 payload without data: prefix */
  data: string
}

export interface AssetIndexItem {
  id: string
  mimeType: string
  size: number
  createdAt: number
}

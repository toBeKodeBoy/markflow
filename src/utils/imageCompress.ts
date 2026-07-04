import { ASSET_MAX_BYTES, ASSET_MAX_DIMENSION } from '../constants'

export interface CompressedImage {
  blob: Blob
  mimeType: string
  width: number
  height: number
  size: number
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    img.src = url
  })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片压缩失败'))),
      mimeType,
      quality
    )
  })
}

/** 将图片压缩到指定尺寸与体积上限 */
export async function compressImage(input: File | Blob): Promise<CompressedImage> {
  const img = await loadImageFromBlob(input)
  let { width, height } = img
  const maxDim = ASSET_MAX_DIMENSION

  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 不可用')
  ctx.drawImage(img, 0, 0, width, height)

  const preferWebp = typeof canvas.toDataURL('image/webp') === 'string'
    && canvas.toDataURL('image/webp').startsWith('data:image/webp')
  const mimeType = preferWebp ? 'image/webp' : 'image/jpeg'

  let quality = 0.92
  let blob = await canvasToBlob(canvas, mimeType, quality)

  while (blob.size > ASSET_MAX_BYTES && quality > 0.4) {
    quality -= 0.1
    blob = await canvasToBlob(canvas, mimeType, quality)
  }

  if (blob.size > ASSET_MAX_BYTES) {
    throw new Error(`图片过大（>${Math.round(ASSET_MAX_BYTES / 1024 / 1024)}MB），请使用更小的图片`)
  }

  return { blob, mimeType, width, height, size: blob.size }
}

/** Blob → Base64（不含 data: 前缀） */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'))
    reader.readAsDataURL(blob)
  })
}

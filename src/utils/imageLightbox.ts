import { useImageLightbox } from '../composables/useImageLightbox'

/** 从事件目标向上查找可预览的 MarkFlow 图片 */
export function findLightboxImage(target: EventTarget | null): HTMLImageElement | null {
  const el = target as HTMLElement | null
  if (!el?.closest) return null
  if (el.closest('.image-scale-actions')) return null

  const frame = el.closest('.markflow-image-frame')
  const img =
    (frame?.querySelector('img.markflow-img') as HTMLImageElement | null) ??
    (el.closest('img.markflow-img') as HTMLImageElement | null)

  if (!img?.src) return null
  return img
}

/** 容器级 dblclick 委托：双击图片打开全屏预览 */
export function handleImageLightboxDblClick(e: MouseEvent): void {
  const img = findLightboxImage(e.target)
  if (!img) return
  e.preventDefault()
  e.stopPropagation()
  useImageLightbox().openLightbox(img.src, img.alt ?? '')
}

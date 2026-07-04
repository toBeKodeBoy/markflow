import { escapeHtml } from './escapeHtml'

export const IMAGE_SCALES = [10, 30, 50, 100] as const
export type ImageScale = (typeof IMAGE_SCALES)[number]
export const DEFAULT_IMAGE_SCALE: ImageScale = 50

const SCALE_CLASS_PREFIX = 'markflow-img-scale-'

export function parseImageScale(title?: string | null): ImageScale {
  if (!title) return DEFAULT_IMAGE_SCALE
  const m = /scale:(\d+)/.exec(title)
  if (!m) return DEFAULT_IMAGE_SCALE
  const n = Number(m[1])
  if ((IMAGE_SCALES as readonly number[]).includes(n)) return n as ImageScale
  return DEFAULT_IMAGE_SCALE
}

export function formatScaleTitle(scale: ImageScale): string {
  return `scale:${scale}`
}

export function scaleClassName(scale: ImageScale): string {
  return `${SCALE_CLASS_PREFIX}${scale}`
}

export function allScaleClassNames(): string[] {
  return IMAGE_SCALES.map(scaleClassName)
}

/** 将 scale 应用到 DOM 图片元素（WYSIWYG 实时展示） */
export function applyImageElementScale(img: HTMLImageElement, title?: string | null): void {
  const scale = parseImageScale(title ?? img.getAttribute('title'))
  img.dataset.scale = String(scale)
  img.classList.add('markflow-img')
}

/** 将 scale 应用到图片 frame（frame 宽度 = 容器百分比，img 填满 frame） */
export function applyImageFrameScale(frame: HTMLElement, title?: string | null): void {
  const scale = parseImageScale(title)
  frame.dataset.scale = String(scale)
  frame.classList.add('markflow-image-frame')
  for (const cls of allScaleClassNames()) {
    frame.classList.remove(cls)
  }
  frame.classList.add(scaleClassName(scale))
}

/** 预览 / PDF：生成带 scale class 的 img HTML */
export function renderImageHtml(src: string, alt: string, title?: string | null): string {
  const scale = parseImageScale(title)
  const scaleClass = scaleClassName(scale)
  const scaleTitle = formatScaleTitle(scale)
  const img = `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" class="markflow-img" data-scale="${scale}" title="${escapeHtml(scaleTitle)}">`
  return `<div class="markflow-image-wrapper markflow-image-preview"><div class="markflow-image-frame ${scaleClass}" data-scale="${scale}">${img}<span class="image-scale-badge">${scale}%</span></div></div>`
}

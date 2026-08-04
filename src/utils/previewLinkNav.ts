import { handlePreviewFragmentClick } from './previewFragmentNav'

export type PreviewLinkKind = 'fragment' | 'external' | 'local-file' | 'unsupported'

export interface PreviewLinkOpenResult {
  handled: boolean
  reason?: PreviewLinkKind | 'bridge-missing' | 'open-failed'
}

export interface PreviewLinkClickOptions {
  root?: HTMLElement
  notify?: (message: string) => void
  openExternalUrl?: (href: string) => boolean
  openLocalPath?: (href: string) => boolean
}

export interface PreviewLinkClickConfig {
  requireModifierKey?: boolean
}

const SAFE_PROTOCOL_RE = /^(https?|mailto|file):/i
const DANGEROUS_PROTOCOL_RE = /^(javascript|data|vbscript|blob):/i
const BARE_DOMAIN_RE = /^(?:www\.|(?:[a-z0-9-]+\.)+[a-z]{2,})(?::\d+)?(?:[/?#].*)?$/i
const LOCALHOST_RE = /^(?:localhost|127(?:\.\d{1,3}){3})(?::\d+)?(?:[/?#].*)?$/i

function isModifiedClick(event: MouseEvent): boolean {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

export function isSafePreviewLinkHref(href: string): boolean {
  const trimmed = href.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('#')) return true
  if (DANGEROUS_PROTOCOL_RE.test(trimmed)) return false
  return SAFE_PROTOCOL_RE.test(trimmed) || BARE_DOMAIN_RE.test(trimmed) || LOCALHOST_RE.test(trimmed)
}

export function normalizePreviewHrefForOpen(href: string): string {
  const trimmed = href.trim()
  if (LOCALHOST_RE.test(trimmed)) return `http://${trimmed}`
  if (BARE_DOMAIN_RE.test(trimmed)) return `https://${trimmed}`
  return trimmed
}

function getLinkKind(href: string): PreviewLinkKind {
  const trimmed = href.trim()
  if (!trimmed) return 'unsupported'
  if (trimmed.startsWith('#')) return 'fragment'
  if (DANGEROUS_PROTOCOL_RE.test(trimmed)) return 'unsupported'
  if (/^https?:/i.test(trimmed) || /^mailto:/i.test(trimmed) || BARE_DOMAIN_RE.test(trimmed) || LOCALHOST_RE.test(trimmed)) return 'external'
  if (/^file:/i.test(trimmed)) return 'local-file'
  return 'unsupported'
}

function notify(options: PreviewLinkClickOptions, message: string) {
  options.notify?.(message)
}

export function openPreviewLinkInBrowser(href: string): boolean {
  if (typeof window === 'undefined' || typeof window.open !== 'function') return false
  try {
    return window.open(href, '_blank', 'noopener') !== null
  } catch {
    return false
  }
}

export function openPreviewExternalHref(href: string): boolean {
  if (typeof window !== 'undefined' && window.markflow?.openExternalUrl) {
    return window.markflow.openExternalUrl(href)
  }
  return openPreviewLinkInBrowser(href)
}

export function openPreviewLocalHref(href: string): boolean {
  if (typeof window !== 'undefined' && window.markflow?.openLocalPath) {
    return window.markflow.openLocalPath(href)
  }
  return openPreviewLinkInBrowser(href)
}

export function handlePreviewLinkClick(
  event: MouseEvent,
  options: PreviewLinkClickOptions,
  config?: PreviewLinkClickConfig,
): PreviewLinkOpenResult {
  if (config?.requireModifierKey) {
    if (!isModifiedClick(event)) return { handled: false }
  } else if (isModifiedClick(event)) {
    return { handled: false }
  }

  const root = options.root
  if (!root) return { handled: false }

  const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
  if (!anchor || !root.contains(anchor)) return { handled: false }

  const href = anchor.getAttribute('href')?.trim() ?? ''
  const kind = getLinkKind(href)
  if (kind === 'fragment') {
    const handled = handlePreviewFragmentClick(event, root)
    return handled ? { handled: true, reason: 'fragment' } : { handled: false }
  }

  if (kind === 'unsupported' || !isSafePreviewLinkHref(href)) {
    event.preventDefault()
    event.stopPropagation()
    notify(options, '暂不支持打开该类型链接')
    return { handled: true, reason: 'unsupported' }
  }

  event.preventDefault()
  event.stopPropagation()

  const normalizedHref = normalizePreviewHrefForOpen(href)

  const opened =
    kind === 'local-file'
      ? options.openLocalPath?.(normalizedHref)
      : options.openExternalUrl?.(normalizedHref)

  if (opened) return { handled: true, reason: kind }

  notify(options, '链接打开失败')
  return { handled: true, reason: options.openExternalUrl || options.openLocalPath ? 'open-failed' : 'bridge-missing' }
}

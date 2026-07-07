import { escapeHtml } from './escapeHtml'
import { sanitizeMermaidSvg } from './sanitizeHtml'
import { encodeMermaidSource, decodeMermaidSource } from './mermaidBlock'

type MermaidApi = typeof import('mermaid').default

let mermaidCounter = 0
let initialized = false
let mermaidModule: MermaidApi | null = null

export function resetMermaidStateForTests(): void {
  mermaidCounter = 0
  initialized = false
  mermaidModule = null
}

function readDocumentTheme(): 'default' | 'dark' {
  if (typeof document === 'undefined') return 'default'
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default'
}

async function loadMermaid(): Promise<MermaidApi> {
  if (!mermaidModule) {
    const mod = await import('mermaid')
    mermaidModule = mod.default
  }
  return mermaidModule
}

async function initMermaid(theme?: 'default' | 'dark'): Promise<MermaidApi> {
  const mermaid = await loadMermaid()
  const resolvedTheme = theme ?? readDocumentTheme()
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: resolvedTheme,
  })
  initialized = true
  return mermaid
}

export function nextMermaidId(): string {
  mermaidCounter += 1
  return `markflow-mermaid-${mermaidCounter}`
}

function applyMermaidSvg(container: HTMLElement, source: string, svgHtml: string) {
  container.className = 'mermaid-rendered'
  container.dataset.mermaidSource = encodeMermaidSource(source.trim())
  container.innerHTML = sanitizeMermaidSvg(svgHtml)
}

export async function renderMermaidToSvg(source: string, id?: string): Promise<string> {
  const mermaid = await initMermaid()
  const renderId = id ?? nextMermaidId()
  try {
    const { svg } = await mermaid.render(renderId, source.trim())
    return sanitizeMermaidSvg(svg)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return `<div class="mermaid-error">${escapeHtml(msg)}</div>`
  }
}

async function mountMermaidNode(node: HTMLElement, source: string) {
  if (!source.trim()) return
  const svg = await renderMermaidToSvg(source)
  const container = document.createElement('div')
  applyMermaidSvg(container, source, svg)
  node.replaceWith(container)
}

export async function hydrateMermaidBlocks(root: ParentNode): Promise<void> {
  const nodes = Array.from(root.querySelectorAll('pre.mermaid')) as HTMLElement[]
  if (nodes.length === 0) return
  if (!initialized) await initMermaid()
  for (const node of nodes) {
    await mountMermaidNode(node, node.textContent ?? '')
  }
}

/** 主题切换等场景：重渲染已 hydrate 的图示并处理未 hydrate 占位 */
export async function refreshMermaidBlocks(root: ParentNode): Promise<void> {
  await initMermaid()

  const pending = Array.from(root.querySelectorAll('pre.mermaid')) as HTMLElement[]
  for (const node of pending) {
    await mountMermaidNode(node, node.textContent ?? '')
  }

  const rendered = Array.from(
    root.querySelectorAll('.mermaid-rendered[data-mermaid-source]'),
  ) as HTMLElement[]
  for (const container of rendered) {
    const encoded = container.dataset.mermaidSource
    if (!encoded) continue
    const source = decodeMermaidSource(encoded)
    const svg = await renderMermaidToSvg(source)
    applyMermaidSvg(container, source, svg)
  }
}

export { renderMermaidBlock, isMermaidLanguage, decodeMermaidSource, encodeMermaidSource } from './mermaidBlock'

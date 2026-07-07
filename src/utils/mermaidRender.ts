import { escapeHtml } from './escapeHtml'

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

export async function renderMermaidToSvg(source: string, id?: string): Promise<string> {
  const mermaid = await initMermaid()
  const renderId = id ?? nextMermaidId()
  try {
    const { svg } = await mermaid.render(renderId, source.trim())
    return svg
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return `<div class="mermaid-error">${escapeHtml(msg)}</div>`
  }
}

export async function hydrateMermaidBlocks(root: ParentNode): Promise<void> {
  const nodes = Array.from(root.querySelectorAll('pre.mermaid')) as HTMLElement[]
  if (nodes.length === 0) return
  if (!initialized) await initMermaid()
  for (const node of nodes) {
    const source = node.textContent ?? ''
    if (!source.trim()) continue
    const svg = await renderMermaidToSvg(source)
    const container = document.createElement('div')
    container.className = 'mermaid-rendered'
    container.innerHTML = svg
    node.replaceWith(container)
  }
}

export { renderMermaidBlock, isMermaidLanguage } from './mermaidBlock'

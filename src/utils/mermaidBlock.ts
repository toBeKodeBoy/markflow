import { escapeHtml } from './escapeHtml'
import { COPY_TEXT } from './codeCopy'

export function isMermaidLanguage(lang: string): boolean {
  return lang.trim().toLowerCase() === 'mermaid'
}

/** marked 预览：输出待客户端 hydrate 的 mermaid 占位结构 */
export function renderMermaidBlock(source: string): string {
  const trimmed = source.replace(/\n$/, '')
  return `<div class="mermaid-diagram-wrapper">
      <div class="mermaid-diagram-actions">
        <span class="code-lang-label">mermaid</span>
        <button class="code-copy-btn">${COPY_TEXT}</button>
      </div>
      <pre class="mermaid">${escapeHtml(trimmed)}</pre>
    </div>`
}

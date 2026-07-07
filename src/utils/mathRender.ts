import katex from 'katex'
import { escapeHtml } from './escapeHtml'

export function renderInlineMath(latex: string): string {
  try {
    return katex.renderToString(latex.trim(), {
      displayMode: false,
      throwOnError: false,
    })
  } catch {
    return `<span class="katex-error">${escapeHtml(`$${latex}$`)}</span>`
  }
}

export function renderBlockMath(latex: string): string {
  try {
    return katex.renderToString(latex.trim(), {
      displayMode: true,
      throwOnError: false,
    })
  } catch {
    return `<div class="katex-error">${escapeHtml(latex)}</div>`
  }
}

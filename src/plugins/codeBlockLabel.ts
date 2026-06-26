import type { Ctx } from '@milkdown/ctx'
import { $prose } from '@milkdown/utils'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import type { EditorView, NodeView, NodeViewConstructor } from '@milkdown/prose/view'
import type { Node as ProseNode } from '@milkdown/prose/model'

const POPULAR_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
  'bash', 'shell', 'sql',
  'html', 'css', 'json', 'xml', 'yaml', 'markdown',
  'plaintext',
]

let globalDropdown: HTMLDivElement | null = null
let activeView: EditorView | null = null
let activeGetPos: (() => number | undefined) | null = null

function getDropdown(): HTMLDivElement {
  if (globalDropdown) return globalDropdown

  const dropdown = document.createElement('div')
  dropdown.className = 'code-lang-dropdown'

  const list = document.createElement('div')
  list.className = 'code-lang-dropdown-list'

  POPULAR_LANGUAGES.forEach((lang) => {
    const item = document.createElement('div')
    item.className = 'code-lang-dropdown-item'
    item.textContent = lang
    item.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (activeView && activeGetPos) {
        const pos = activeGetPos()
        if (pos != null) {
          activeView.dispatch(
            activeView.state.tr.setNodeAttribute(pos, 'language', lang)
          )
        }
      }
      hideDropdown()
    })
    list.appendChild(item)
  })

  dropdown.appendChild(list)
  document.body.appendChild(dropdown)

  document.addEventListener('mousedown', (e) => {
    if (!dropdown.contains(e.target as Node)) {
      hideDropdown()
    }
  })

  globalDropdown = dropdown
  return dropdown
}

function showDropdown(anchor: HTMLElement, view: EditorView, getPos: () => number | undefined) {
  const dropdown = getDropdown()
  activeView = view
  activeGetPos = getPos

  const rect = anchor.getBoundingClientRect()
  dropdown.style.position = 'fixed'
  dropdown.style.top = `${rect.bottom + 4}px`
  dropdown.style.right = `${window.innerWidth - rect.right}px`
  dropdown.style.left = 'auto'
  dropdown.style.display = 'block'
}

function hideDropdown() {
  if (globalDropdown) {
    globalDropdown.style.display = 'none'
  }
  activeView = null
  activeGetPos = null
}

function buildCodeBlockDOM(lang: string): {
  wrapper: HTMLDivElement
  badge: HTMLSpanElement
  label: HTMLSpanElement
  chevron: HTMLSpanElement
  pre: HTMLPreElement
  code: HTMLElement
} {
  const wrapper = document.createElement('div')
  wrapper.className = 'code-block-wrapper milkdown-code-block'

  const pre = document.createElement('pre')
  if (lang) {
    pre.setAttribute('data-language', lang)
    pre.dataset.languagePresent = 'true'
  }

  const code = document.createElement('code')
  if (lang) {
    code.className = `language-${lang}`
  }
  pre.appendChild(code)

  const badge = document.createElement('span')
  badge.className = 'code-lang-badge'

  const label = document.createElement('span')
  label.className = 'code-lang-label'
  label.textContent = lang

  const chevron = document.createElement('span')
  chevron.className = 'code-lang-chevron'
  chevron.textContent = '\u25BE'

  badge.appendChild(label)
  badge.appendChild(chevron)

  wrapper.appendChild(pre)
  wrapper.appendChild(badge)

  return { wrapper, badge, label, chevron, pre, code }
}

function attachClickHandlers(
  badge: HTMLSpanElement,
  view: EditorView,
  getPos: () => number | undefined,
) {
  badge.addEventListener('mousedown', (e) => {
    e.preventDefault()
    e.stopPropagation()
    showDropdown(badge, view, getPos)
  })
}

class CodeBlockNodeView implements NodeView {
  dom: HTMLDivElement
  contentDOM: HTMLElement
  private pre: HTMLPreElement
  private code: HTMLElement
  private badge: HTMLSpanElement
  private label: HTMLSpanElement
  private view: EditorView
  private getPos: () => number | undefined

  constructor(node: ProseNode, view: EditorView, getPos: () => number | undefined) {
    this.view = view
    this.getPos = getPos

    const lang = node.attrs.language || ''
    const { wrapper, badge, label, pre, code } = buildCodeBlockDOM(lang)

    if (lang) {
      attachClickHandlers(badge, view, getPos)
      wrapper.classList.add('has-language')
    }

    this.dom = wrapper
    this.pre = pre
    this.code = code
    this.badge = badge
    this.label = label
    this.contentDOM = code
  }

  update(node: ProseNode): boolean {
    if (node.type.name !== 'code_block') return false

    const lang = node.attrs.language || ''

    // Sync data-language and code class for linkage
    if (lang) {
      this.pre.setAttribute('data-language', lang)
      this.pre.dataset.languagePresent = 'true'
      this.code.className = `language-${lang}`
    } else {
      this.pre.removeAttribute('data-language')
      delete this.pre.dataset.languagePresent
      this.code.className = ''
    }

    this.label.textContent = lang

    if (lang) {
      this.dom.classList.add('has-language')
      this.badge.style.display = ''
      if (!this.badge.dataset.clickAttached) {
        this.badge.dataset.clickAttached = 'true'
        attachClickHandlers(this.badge, this.view, this.getPos)
      }
    } else {
      this.dom.classList.remove('has-language')
      this.badge.style.display = 'none'
    }

    return true
  }

  destroy() {
    hideDropdown()
  }

  ignoreMutation() {
    return true
  }
}

export const codeBlockLabelPlugin = $prose((_ctx: Ctx) => {
  return new Plugin({
    key: new PluginKey('MARKFLOW_CODE_BLOCK_LABEL'),
    props: {
      nodeViews: {
        code_block: (node, view, getPos): NodeView => {
          return new CodeBlockNodeView(node, view, getPos)
        },
      } as Record<string, NodeViewConstructor>,
    },
  })
})

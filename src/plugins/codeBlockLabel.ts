import type { Ctx } from '@milkdown/ctx'
import { $prose } from '@milkdown/utils'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import type { EditorView, NodeView, NodeViewConstructor, ViewMutationRecord } from '@milkdown/prose/view'
import type { Node as ProseNode } from '@milkdown/prose/model'
import hljs from 'highlight.js'
import { handleCodeCopy } from '../utils/codeCopy'

const POPULAR_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
  'bash', 'shell', 'sql',
  'html', 'css', 'json', 'xml', 'yaml', 'markdown',
  'plaintext',
]

/** 全量语言列表：常用语言靠前 + hljs 支持的所有语言 */
const ALL_LANGUAGES = (() => {
  const seen = new Set<string>(POPULAR_LANGUAGES)
  const extra = hljs.listLanguages().filter((lang) => {
    if (seen.has(lang)) return false
    seen.add(lang)
    return true
  })
  return [...POPULAR_LANGUAGES, ...extra]
})()

let globalDropdown: HTMLDivElement | null = null
let globalList: HTMLDivElement | null = null
let searchInput: HTMLInputElement | null = null
let activeView: EditorView | null = null
let activeGetPos: (() => number | undefined) | null = null
let activeIndex = -1

/** 对 item 中的匹配文本加 <span class="highlight"> 高亮 */
function highlightMatch(text: string, query: string): string {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    text.slice(0, idx) +
    `<span class="highlight">${text.slice(idx, idx + query.length)}</span>` +
    text.slice(idx + query.length)
  )
}

/** 过滤语言列表：按空格分词，所有分词都匹配才算 */
function filterLanguages(query: string): string[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return ALL_LANGUAGES

  const terms = trimmed.split(/\s+/)
  return ALL_LANGUAGES.filter((lang) =>
    terms.every((t) => lang.toLowerCase().includes(t)),
  )
}

/** 重建列表 DOM */
function renderList(items: string[], query: string) {
  if (!globalList) return
  globalList.innerHTML = ''

  if (items.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'code-lang-dropdown-empty'
    empty.textContent = '无匹配语言'
    globalList.appendChild(empty)
    return
  }

  items.forEach((lang) => {
    const item = document.createElement('div')
    item.className = 'code-lang-dropdown-item'
    item.dataset.lang = lang
    item.innerHTML = highlightMatch(lang, query)
    item.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      selectLanguage(lang)
    })
    globalList!.appendChild(item)
  })
}

function selectLanguage(lang: string) {
  if (activeView && activeGetPos) {
    const pos = activeGetPos()
    if (pos != null) {
      activeView.dispatch(
        activeView.state.tr.setNodeAttribute(pos, 'language', lang),
      )
    }
  }
  hideDropdown()
}

function onSearchInput() {
  if (!searchInput) return
  const query = searchInput.value
  const items = filterLanguages(query)
  renderList(items, query)
  activeIndex = -1
}

function onSearchKeyDown(e: KeyboardEvent) {
  if (!globalList) return
  const items = globalList.querySelectorAll<HTMLDivElement>('.code-lang-dropdown-item')
  if (items.length === 0) return

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      activeIndex = Math.min(activeIndex + 1, items.length - 1)
      updateActiveItem(items)
      break
    case 'ArrowUp':
      e.preventDefault()
      activeIndex = Math.max(activeIndex - 1, 0)
      updateActiveItem(items)
      break
    case 'Enter': {
      e.preventDefault()
      const index = activeIndex >= 0 ? activeIndex : 0
      if (index < items.length) {
        selectLanguage(items[index].dataset.lang || '')
      }
      break
    }
    case 'Escape':
      e.preventDefault()
      hideDropdown()
      break
  }
}

function updateActiveItem(items: NodeListOf<HTMLDivElement>) {
  items.forEach((el, i) => {
    el.classList.toggle('active', i === activeIndex)
  })
  // 滚动到可见区域
  if (activeIndex >= 0 && items[activeIndex]) {
    items[activeIndex].scrollIntoView({ block: 'nearest' })
  }
}

function getDropdown(): HTMLDivElement {
  if (globalDropdown) return globalDropdown

  const dropdown = document.createElement('div')
  dropdown.className = 'code-lang-dropdown'

  // --- 搜索输入区域 ---
  const searchWrap = document.createElement('div')
  searchWrap.className = 'code-lang-search-wrap'

  const searchIcon = document.createElement('span')
  searchIcon.className = 'code-lang-search-icon'
  searchIcon.textContent = '\u{1F50D}' // 🔍

  const input = document.createElement('input')
  input.className = 'code-lang-search-input'
  input.type = 'text'
  input.placeholder = '搜索语言…'
  input.spellcheck = false
  input.autocomplete = 'off'
  input.addEventListener('input', onSearchInput)
  input.addEventListener('keydown', onSearchKeyDown)

  searchWrap.appendChild(searchIcon)
  searchWrap.appendChild(input)
  dropdown.appendChild(searchWrap)
  searchInput = input

  // --- 列表区域 ---
  const list = document.createElement('div')
  list.className = 'code-lang-dropdown-list'
  dropdown.appendChild(list)
  globalList = list

  // 首次渲染全部语言
  renderList(ALL_LANGUAGES, '')

  document.body.appendChild(dropdown)

  document.addEventListener('mousedown', (e) => {
    if (dropdown.style.display !== 'none' && !dropdown.contains(e.target as Node)) {
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
  activeIndex = -1

  // 重置搜索
  if (searchInput) {
    searchInput.value = ''
    renderList(ALL_LANGUAGES, '')
  }

  const rect = anchor.getBoundingClientRect()
  dropdown.style.position = 'fixed'
  dropdown.style.top = `${rect.bottom + 4}px`
  dropdown.style.right = `${window.innerWidth - rect.right}px`
  dropdown.style.minWidth = `${Math.max(rect.width, 160)}px`
  dropdown.style.left = ''
  dropdown.style.width = ''
  dropdown.style.display = 'block'

  // 聚焦搜索框
  requestAnimationFrame(() => {
    searchInput?.focus()
  })
}

function hideDropdown() {
  if (globalDropdown) {
    globalDropdown.style.display = 'none'
  }
  activeView = null
  activeGetPos = null
  activeIndex = -1
}

function buildCodeBlockDOM(lang: string): {
  wrapper: HTMLDivElement
  badge: HTMLSpanElement
  label: HTMLSpanElement
  chevron: HTMLSpanElement
  pre: HTMLPreElement
  code: HTMLElement
  highlightCode: HTMLElement
} {
  const wrapper = document.createElement('div')
  wrapper.className = 'code-block-wrapper milkdown-code-block'

  const pre = document.createElement('pre')
  if (lang) {
    pre.setAttribute('data-language', lang)
    pre.dataset.languagePresent = 'true'
  }

  const layers = document.createElement('div')
  layers.className = 'code-block-layers'

  // 可见的高亮代码层（与 contentDOM 同格叠放）
  const highlightCode = document.createElement('code')
  highlightCode.className = 'hljs code-block-highlight'
  if (lang) {
    highlightCode.classList.add(`language-${lang}`)
  }
  layers.appendChild(highlightCode)

  // contentDOM：ProseMirror 管理此元素
  const code = document.createElement('code')
  code.className = 'code-block-editable'
  if (lang) {
    code.classList.add(`language-${lang}`)
  }
  layers.appendChild(code)

  pre.appendChild(layers)

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

  const copyBtn = document.createElement('button')
  copyBtn.className = 'code-copy-btn'
  copyBtn.textContent = '复制'

  const actions = document.createElement('div')
  actions.className = 'code-block-actions'
  actions.appendChild(badge)
  actions.appendChild(copyBtn)

  wrapper.appendChild(pre)
  wrapper.appendChild(actions)

  return { wrapper, badge, label, chevron, pre, code, highlightCode, copyBtn }
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
  private highlightCode: HTMLElement
  private badge: HTMLSpanElement
  private label: HTMLSpanElement
  private copyBtn: HTMLButtonElement
  private view: EditorView
  private getPos: () => number | undefined
  private trailingObserver: MutationObserver
  private highlightTimer: ReturnType<typeof setTimeout> | null = null

  constructor(node: ProseNode, view: EditorView, getPos: () => number | undefined) {
    this.view = view
    this.getPos = getPos

    const lang = node.attrs.language || ''
    const { wrapper, badge, label, pre, code, highlightCode, copyBtn } = buildCodeBlockDOM(lang)

    if (lang) {
      attachClickHandlers(badge, view, getPos)
      wrapper.classList.add('has-language')
    }

    this.dom = wrapper
    this.pre = pre
    this.code = code
    this.highlightCode = highlightCode
    this.badge = badge
    this.label = label
    this.copyBtn = copyBtn
    this.contentDOM = code

    copyBtn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      handleCodeCopy(copyBtn)
    })

    // 首次高亮
    this.highlightContent(node.textContent, lang)
    requestAnimationFrame(() => this.syncTrailingBreak())

    this.trailingObserver = new MutationObserver(() => this.syncTrailingBreak())
    this.trailingObserver.observe(this.code, { childList: true, subtree: true })
  }

  /** 同步 ProseMirror 尾部 <br>，使高亮层行数与光标层一致 */
  private syncTrailingBreak() {
    const hasTrailing = !!this.code.querySelector('.ProseMirror-trailingBreak')
    let mirror = this.highlightCode.querySelector('.hljs-trailing-mirror')
    if (hasTrailing) {
      if (!mirror) {
        mirror = document.createElement('br')
        mirror.className = 'hljs-trailing-mirror'
        this.highlightCode.appendChild(mirror)
      }
    } else if (mirror) {
      mirror.remove()
    }
  }

  /** 防抖调度高亮，避免大代码块逐字输入时卡顿 */
  private scheduleHighlight(text: string, lang: string) {
    if (this.highlightTimer) clearTimeout(this.highlightTimer)
    this.highlightTimer = setTimeout(() => {
      this.highlightTimer = null
      this.highlightContent(text, lang)
    }, 80)
  }

  /** 用 hljs 给高亮代码层着色 */
  private highlightContent(text: string, lang: string) {
    const code = this.highlightCode
    code.className = 'hljs code-block-highlight'
    if (lang) {
      code.classList.add(`language-${lang}`)
    }

    if (!text.trim()) {
      code.innerHTML = ''
      this.syncTrailingBreak()
      return
    }

    if (lang && hljs.getLanguage(lang)) {
      const result = hljs.highlight(text, { language: lang })
      code.innerHTML = result.value
    } else if (lang) {
      const result = hljs.highlightAuto(text)
      code.innerHTML = result.value
    } else {
      const result = hljs.highlightAuto(text)
      code.innerHTML = result.value
    }
    this.syncTrailingBreak()
  }

  private setEditableCodeClass(lang: string) {
    this.code.className = 'code-block-editable'
    if (lang) {
      this.code.classList.add(`language-${lang}`)
    }
  }

  update(node: ProseNode): boolean {
    if (node.type.name !== 'code_block') return false

    const lang = node.attrs.language || ''
    const text = node.textContent

    // 重新高亮（防抖）
    this.scheduleHighlight(text, lang)

    // Sync data-language and code class for linkage
    if (lang) {
      this.pre.setAttribute('data-language', lang)
      this.pre.dataset.languagePresent = 'true'
      this.setEditableCodeClass(lang)
    } else {
      this.pre.removeAttribute('data-language')
      delete this.pre.dataset.languagePresent
      this.setEditableCodeClass('')
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
    if (this.highlightTimer) clearTimeout(this.highlightTimer)
    this.trailingObserver.disconnect()
    hideDropdown()
  }

  ignoreMutation(mutation: ViewMutationRecord) {
    // 只忽略 contentDOM 之外的突变（高亮层、语言标签等自定义 UI）
    // contentDOM 上的突变需要让 ProseMirror 处理，以保证文档状态与 DOM 同步
    if (!this.contentDOM) return true
    if (mutation.type === 'selection') return true
    return !this.contentDOM.contains(mutation.target)
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

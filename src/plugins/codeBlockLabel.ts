import type { Ctx } from '@milkdown/ctx'
import { $prose } from '@milkdown/utils'
import { Plugin, PluginKey, TextSelection, type Command } from '@milkdown/prose/state'
import type { EditorView, NodeView, NodeViewConstructor, ViewMutationRecord } from '@milkdown/prose/view'
import type { Node as ProseNode } from '@milkdown/prose/model'
import hljs from 'highlight.js'
import { hideCodeLanguageDropdown, showCodeLanguageDropdown } from '../utils/codeLanguageDropdown'

type CodeBlockHandle = {
  view: EditorView
  getPos: () => number | undefined
  badge: HTMLSpanElement
}

type CodeBlockWrapper = HTMLDivElement & { __markflowCodeBlock?: CodeBlockHandle }

function setCodeBlockHandle(wrapper: HTMLDivElement, handle: CodeBlockHandle) {
  ;(wrapper as CodeBlockWrapper).__markflowCodeBlock = handle
}

function clearCodeBlockHandle(wrapper: HTMLDivElement) {
  delete (wrapper as CodeBlockWrapper).__markflowCodeBlock
}

function openLangDropdown(
  badge: HTMLSpanElement,
  view: EditorView,
  getPos: () => number | undefined,
) {
  showCodeLanguageDropdown(badge, {
    onSelect: (lang) => {
      const pos = getPos()
      if (pos != null) {
        view.dispatch(view.state.tr.setNodeAttribute(pos, 'language', lang))
      }
    },
  })
}

/** 当光标在代码块末尾时，ArrowDown 退出至代码块下方 */
const exitCodeBlockCommand: Command = (state, dispatch) => {
  const { $from } = state.selection
  let codeBlockDepth = -1
  for (let d = $from.depth; d >= 0; d--) {
    if ($from.node(d).type.name === 'code_block') {
      codeBlockDepth = d
      break
    }
  }
  if (codeBlockDepth < 0) return false

  const endPos = $from.end(codeBlockDepth)
  if ($from.pos < endPos) return false

  if (!dispatch) return true

  const afterPos = $from.after(codeBlockDepth)
  const $after = state.doc.resolve(afterPos)
  const atParentEnd = $after.parentOffset >= $after.parent.content.size

  if (atParentEnd) {
    const tr = state.tr
    tr.insert(afterPos, state.schema.nodes.paragraph.create())
    tr.setSelection(TextSelection.create(tr.doc, afterPos + 1))
    dispatch(tr.scrollIntoView())
  } else {
    dispatch(state.tr.setSelection(TextSelection.near($after)).scrollIntoView())
  }
  return true
}

function buildCodeBlockDOM(lang: string): {
  wrapper: HTMLDivElement
  actions: HTMLDivElement
  badge: HTMLSpanElement
  label: HTMLSpanElement
  chevron: HTMLSpanElement
  pre: HTMLPreElement
  code: HTMLElement
  highlightCode: HTMLElement
  editSpacer: HTMLDivElement
  copyBtn: HTMLButtonElement
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

  const editSpacer = document.createElement('div')
  editSpacer.className = 'code-block-edit-spacer'
  editSpacer.setAttribute('aria-hidden', 'true')
  layers.appendChild(editSpacer)

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
  copyBtn.type = 'button'
  copyBtn.className = 'code-copy-btn'
  copyBtn.textContent = '复制'

  const actions = document.createElement('div')
  actions.className = 'code-block-actions'
  actions.appendChild(badge)
  actions.appendChild(copyBtn)

  // actions 置于 pre 之前，配合 z-index 保证右上角可点击
  wrapper.appendChild(actions)
  wrapper.appendChild(pre)

  return { wrapper, actions, badge, label, chevron, pre, code, highlightCode, editSpacer, copyBtn }
}

/** 在 actions 上绑定 mousedown（捕获阶段），扩大可点区域并避免 ProseMirror 抢焦点 */
function attachClickHandlers(
  actions: HTMLDivElement,
  badge: HTMLSpanElement,
  view: EditorView,
  getPos: () => number | undefined,
): ((e: MouseEvent) => void) | null {
  if (actions.dataset.langDropdownAttached) return null

  const handler = (e: MouseEvent) => {
    if (!(e.target as HTMLElement).closest?.('.code-lang-badge')) return
    e.preventDefault()
    e.stopPropagation()
    openLangDropdown(badge, view, getPos)
  }

  actions.addEventListener('mousedown', handler, true)
  actions.dataset.langDropdownAttached = 'true'
  return handler
}

/** WYSIWYG 容器级兜底：从 wrapper 读取上下文，不依赖 WeakMap */
export function handleLangBadgeCaptureMouseDown(e: MouseEvent): boolean {
  const badge = (e.target as HTMLElement).closest?.('.code-lang-badge') as HTMLSpanElement | null
  if (!badge) return false
  const wrapper = badge.closest('.milkdown-code-block') as CodeBlockWrapper | null
  const ctx = wrapper?.__markflowCodeBlock
  if (!ctx) return false
  e.preventDefault()
  e.stopPropagation()
  openLangDropdown(ctx.badge, ctx.view, ctx.getPos)
  return true
}

class CodeBlockNodeView implements NodeView {
  dom: HTMLDivElement
  contentDOM: HTMLElement
  private pre: HTMLPreElement
  private code: HTMLElement
  private highlightCode: HTMLElement
  private editSpacer: HTMLDivElement
  private actions: HTMLDivElement
  private badge: HTMLSpanElement
  private label: HTMLSpanElement
  private view: EditorView
  private getPos: () => number | undefined
  private trailingObserver: MutationObserver
  private highlightTimer: ReturnType<typeof setTimeout> | null = null
  private actionsMouseDownHandler: ((e: MouseEvent) => void) | null = null

  constructor(node: ProseNode, view: EditorView, getPos: () => number | undefined) {
    this.view = view
    this.getPos = getPos

    const lang = node.attrs.language || ''
    const { wrapper, actions, badge, label, pre, code, highlightCode, editSpacer } = buildCodeBlockDOM(lang)

    setCodeBlockHandle(wrapper, { view, getPos, badge })

    if (lang) {
      this.actionsMouseDownHandler = attachClickHandlers(actions, badge, view, getPos)
      wrapper.classList.add('has-language')
    }

    this.dom = wrapper
    this.actions = actions
    this.pre = pre
    this.code = code
    this.highlightCode = highlightCode
    this.editSpacer = editSpacer
    this.badge = badge
    this.label = label
    this.contentDOM = code

    // 复制交互由 WysiwygEditor 容器捕获阶段委托处理（见 handleCodeCopyCapture*）

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
    this.syncLayerLineCount()
  }

  private layerSyncTimer: ReturnType<typeof requestAnimationFrame> | null = null

  /** 测量高亮层与编辑层的视觉行数，若不一致则在编辑层补 padding，保证光标可达 */
  private syncLayerLineCount() {
    if (this.layerSyncTimer) return
    this.layerSyncTimer = requestAnimationFrame(() => {
      this.layerSyncTimer = null
      const highlightRects = this.highlightCode.getClientRects()
      const editRects = this.code.getClientRects()
      const highlightLines = new Set<number>()
      for (let i = 0; i < highlightRects.length; i++) {
        highlightLines.add(Math.round(highlightRects[i].top))
      }
      const editLines = new Set<number>()
      for (let i = 0; i < editRects.length; i++) {
        editLines.add(Math.round(editRects[i].top))
      }
      if (highlightLines.size > editLines.size) {
        const diff = highlightLines.size - editLines.size
        const lineHeight = parseFloat(getComputedStyle(this.code).lineHeight) || 24
        this.editSpacer.style.height = `${diff * lineHeight}px`
      } else {
        this.editSpacer.style.height = '0px'
      }
    })
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
      setCodeBlockHandle(this.dom, { view: this.view, getPos: this.getPos, badge: this.badge })
      if (!this.actions.dataset.langDropdownAttached) {
        this.actionsMouseDownHandler = attachClickHandlers(
          this.actions,
          this.badge,
          this.view,
          this.getPos,
        )
      }
    } else {
      this.dom.classList.remove('has-language')
      this.badge.style.display = 'none'
    }

    return true
  }

  destroy() {
    if (this.highlightTimer) clearTimeout(this.highlightTimer)
    if (this.layerSyncTimer) cancelAnimationFrame(this.layerSyncTimer)
    this.trailingObserver.disconnect()
    if (this.actionsMouseDownHandler) {
      this.actions.removeEventListener('mousedown', this.actionsMouseDownHandler, true)
      delete this.actions.dataset.langDropdownAttached
    }
    clearCodeBlockHandle(this.dom)
    hideCodeLanguageDropdown()
  }

  stopEvent(event: Event): boolean {
    const target = event.target
    if (!(target instanceof Node)) return false
    return this.dom.contains(target) && !this.contentDOM.contains(target)
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
      handleDOMEvents: {
        mousedown(_view, event) {
          return handleLangBadgeCaptureMouseDown(event)
        },
      },
      nodeViews: {
        code_block: (node, view, getPos): NodeView => {
          return new CodeBlockNodeView(node, view, getPos)
        },
      } as Record<string, NodeViewConstructor>,
    },
  })
})

export const codeBlockExitPlugin = $prose((_ctx: Ctx) => {
  return new Plugin({
    key: new PluginKey('MARKFLOW_CODE_BLOCK_EXIT'),
    props: {
      handleKeyDown: (view, event) => {
        if (event.key === 'ArrowDown') {
          return exitCodeBlockCommand(view.state, view.dispatch, view)
        }
        return false
      },
    },
  })
})

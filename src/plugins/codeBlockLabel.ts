import type { Ctx } from '@milkdown/ctx'
import { $prose } from '@milkdown/utils'
import { Plugin, PluginKey, TextSelection, type Command } from '@milkdown/prose/state'
import type { EditorView, NodeView, NodeViewConstructor, ViewMutationRecord } from '@milkdown/prose/view'
import type { Node as ProseNode } from '@milkdown/prose/model'
import hljs from 'highlight.js'
import { hideCodeLanguageDropdown, showCodeLanguageDropdown } from '../utils/codeLanguageDropdown'
import { COPY_TEXT } from '../utils/codeCopy'
import { isMermaidLanguage, renderMermaidToSvg } from '../utils/mermaidRender'

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

/** 褰撳厜鏍囧湪浠ｇ爜鍧楁湯灏炬椂锛孉rrowDown 閫€鍑鸿嚦浠ｇ爜鍧椾笅鏂?*/
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
  copyBtn.textContent = COPY_TEXT

  const actions = document.createElement('div')
  actions.className = 'code-block-actions'
  actions.appendChild(badge)
  actions.appendChild(copyBtn)

  // actions 缃簬 pre 涔嬪墠锛岄厤鍚?z-index 淇濊瘉鍙充笂瑙掑彲鐐瑰嚮
  wrapper.appendChild(actions)
  wrapper.appendChild(pre)

  return { wrapper, actions, badge, label, chevron, pre, code, highlightCode, editSpacer, copyBtn }
}

/** 鍦?actions 涓婄粦瀹?mousedown锛堟崟鑾烽樁娈碉級锛屾墿澶у彲鐐瑰尯鍩熷苟閬垮厤 ProseMirror 鎶㈢劍鐐?*/
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

/** WYSIWYG 瀹瑰櫒绾у厹搴曪細浠?wrapper 璇诲彇涓婁笅鏂囷紝涓嶄緷璧?WeakMap */
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
  private mermaidTimer: ReturnType<typeof setTimeout> | null = null
  private mermaidRenderGen = 0
  private mermaidPreview: HTMLDivElement
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

    this.mermaidPreview = document.createElement('div')
    this.mermaidPreview.className = 'mermaid-preview'
    wrapper.appendChild(this.mermaidPreview)

    // 复制交互由 WysiwygEditor 容器捕获阶段委托处理（见 handleCodeCopyCapture*）
    // 棣栨楂樹寒
    this.highlightContent(node.textContent, lang)
    requestAnimationFrame(() => this.syncTrailingBreak())

    this.trailingObserver = new MutationObserver(() => this.syncTrailingBreak())
    this.trailingObserver.observe(this.code, { childList: true, subtree: true })
    this.scheduleMermaidPreview(node.textContent, lang)
  }

  private scheduleMermaidPreview(text: string, lang: string) {
    if (this.mermaidTimer) clearTimeout(this.mermaidTimer)
    if (!isMermaidLanguage(lang)) {
      this.mermaidRenderGen += 1
      this.mermaidPreview.innerHTML = ''
      this.mermaidPreview.style.display = 'none'
      this.dom.classList.remove('mermaid-code-block')
      return
    }
    this.mermaidPreview.style.display = ''
    this.dom.classList.add('mermaid-code-block')
    const gen = ++this.mermaidRenderGen
    this.mermaidTimer = setTimeout(() => {
      this.mermaidTimer = null
      void this.renderMermaidPreview(text, gen)
    }, 120)
  }

  private async renderMermaidPreview(text: string, gen: number) {
    if (gen !== this.mermaidRenderGen) return
    if (!this.dom.classList.contains('mermaid-code-block')) return

    const currentText = this.code.textContent ?? ''
    if (currentText.trim() !== text.trim()) return

    const trimmed = text.trim()
    if (!trimmed) {
      this.mermaidPreview.innerHTML = ''
      return
    }

    const svg = await renderMermaidToSvg(trimmed)
    if (gen !== this.mermaidRenderGen) return
    if ((this.code.textContent ?? '').trim() !== trimmed) return

    this.mermaidPreview.innerHTML = svg
  }

  /** 鍚屾 ProseMirror 灏鹃儴 <br>锛屼娇楂樹寒灞傝鏁颁笌鍏夋爣灞備竴鑷?*/
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

  /** 娴嬮噺楂樹寒灞備笌缂栬緫灞傜殑瑙嗚琛屾暟锛岃嫢涓嶄竴鑷村垯鍦ㄧ紪杈戝眰琛?padding锛屼繚璇佸厜鏍囧彲杈?*/
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

  /** 闃叉姈璋冨害楂樹寒锛岄伩鍏嶅ぇ浠ｇ爜鍧楅€愬瓧杈撳叆鏃跺崱椤?*/
  private scheduleHighlight(text: string, lang: string) {
    if (this.highlightTimer) clearTimeout(this.highlightTimer)
    this.highlightTimer = setTimeout(() => {
      this.highlightTimer = null
      this.highlightContent(text, lang)
    }, 80)
  }

  /** 鐢?hljs 缁欓珮浜唬鐮佸眰鐫€鑹?*/
  private highlightContent(text: string, lang: string) {
    const code = this.highlightCode
    code.className = 'hljs code-block-highlight'
    if (lang) {
      code.classList.add(`language-${lang}`)
    }

    if (isMermaidLanguage(lang)) {
      code.innerHTML = ''
      this.syncTrailingBreak()
      return
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

    // 閲嶆柊楂樹寒锛堥槻鎶栵級
    this.scheduleHighlight(text, lang)
    this.scheduleMermaidPreview(text, lang)

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
    if (this.mermaidTimer) clearTimeout(this.mermaidTimer)
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
    // 鍙拷鐣?contentDOM 涔嬪鐨勭獊鍙橈紙楂樹寒灞傘€佽瑷€鏍囩绛夎嚜瀹氫箟 UI锛?    // contentDOM 涓婄殑绐佸彉闇€瑕佽 ProseMirror 澶勭悊锛屼互淇濊瘉鏂囨。鐘舵€佷笌 DOM 鍚屾
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

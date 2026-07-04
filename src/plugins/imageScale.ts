import { $prose } from '@milkdown/utils'
import { Plugin, PluginKey, NodeSelection } from '@milkdown/prose/state'
import type { EditorView, NodeView } from '@milkdown/prose/view'
import type { Node as ProseNode } from '@milkdown/prose/model'
import {
  IMAGE_SCALES,
  applyImageElementScale,
  applyImageFrameScale,
  formatScaleTitle,
  parseImageScale,
  type ImageScale,
} from '../utils/imageScale'

function buildScaleButton(scale: ImageScale, active: boolean): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'image-scale-btn' + (active ? ' active' : '')
  btn.textContent = `${scale}%`
  btn.dataset.scale = String(scale)
  btn.title = `显示为 ${scale}%`
  return btn
}

class ImageScaleNodeView implements NodeView {
  dom: HTMLDivElement
  frame: HTMLDivElement
  img: HTMLImageElement
  actions: HTMLDivElement
  private node: ProseNode
  private view: EditorView
  private getPos: () => number | undefined

  constructor(
    node: ProseNode,
    view: EditorView,
    getPos: () => number | undefined
  ) {
    this.node = node
    this.view = view
    this.getPos = getPos
    this.dom = document.createElement('div')
    this.dom.className = 'markflow-image-wrapper'

    this.frame = document.createElement('div')
    this.frame.className = 'markflow-image-frame'

    this.img = document.createElement('img')
    this.img.draggable = false
    this.syncImage(this.node)

    this.actions = document.createElement('div')
    this.actions.className = 'image-scale-actions'
    this.rebuildToolbar(this.node)

    this.frame.appendChild(this.img)
    this.frame.appendChild(this.actions)
    this.dom.appendChild(this.frame)
  }

  private syncImage(node: ProseNode) {
    this.img.src = node.attrs.src ?? ''
    this.img.alt = node.attrs.alt ?? ''
    const title = node.attrs.title ?? null
    if (title) {
      this.img.setAttribute('title', title)
    } else {
      this.img.removeAttribute('title')
    }
    applyImageElementScale(this.img, title)
    applyImageFrameScale(this.frame, title)
  }

  private rebuildToolbar(node: ProseNode) {
    this.actions.replaceChildren()
    const current = parseImageScale(node.attrs.title)
    for (const scale of IMAGE_SCALES) {
      const btn = buildScaleButton(scale, scale === current)
      btn.addEventListener('mousedown', (e) => e.preventDefault())
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.setScale(scale)
      })
      this.actions.appendChild(btn)
    }
  }

  private setScale(scale: ImageScale) {
    const pos = this.getPos()
    if (pos == null) return
    const title = formatScaleTitle(scale)
    this.view.dispatch(this.view.state.tr.setNodeAttribute(pos, 'title', title))
    this.view.focus()
  }

  update(node: ProseNode): boolean {
    if (node.type !== this.node.type) return false
    this.node = node
    this.syncImage(node)
    this.rebuildToolbar(node)
    return true
  }

  selectNode() {
    this.dom.classList.add('selected')
  }

  deselectNode() {
    this.dom.classList.remove('selected')
  }

  stopEvent(event: Event): boolean {
    return this.actions.contains(event.target as Node)
  }

  ignoreMutation(): boolean {
    return true
  }
}

/// WYSIWYG 图片：居中完整显示 + 比例工具条
export const imageScalePlugin = $prose(() => {
  return new Plugin({
    key: new PluginKey('MARKFLOW_IMAGE_SCALE'),
    props: {
      nodeViews: {
        image: (node, view, getPos) =>
          new ImageScaleNodeView(node, view, getPos as () => number | undefined),
      },
      handleClickOn(view, _pos, node, nodePos, _event, direct) {
        if (!direct || node.type.name !== 'image') return false
        view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos)))
        return true
      },
    },
  })
})

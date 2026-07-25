import type { MilkdownPlugin } from '@milkdown/ctx'
import type { Node as ProseNode } from '@milkdown/prose/model'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { Decoration, DecorationSet } from '@milkdown/prose/view'
import { $prose } from '@milkdown/utils'

const pluginKey = new PluginKey('MARKFLOW_FOOTNOTE_DISPLAY')

function ensureIndex(order: Map<string, number>, label: string): number | null {
  const trimmed = label.trim()
  if (!trimmed) return null
  if (!order.has(trimmed)) {
    order.set(trimmed, order.size + 1)
  }
  return order.get(trimmed) ?? null
}

/** 按首次引用顺序编号；未引用定义接在后面。供单测与 decoration 共用。 */
export function buildFootnoteIndexMap(doc: ProseNode): Map<string, number> {
  const order = new Map<string, number>()

  doc.descendants((node) => {
    if (node.type.name === 'footnote_reference') {
      ensureIndex(order, String(node.attrs.label ?? ''))
    }
  })

  doc.descendants((node) => {
    if (node.type.name === 'footnote_definition') {
      ensureIndex(order, String(node.attrs.label ?? ''))
    }
  })

  return order
}

function buildFootnoteDecorations(doc: ProseNode): DecorationSet {
  const order = buildFootnoteIndexMap(doc)
  const decorations: Decoration[] = []

  doc.descendants((node, pos) => {
    if (node.type.name !== 'footnote_reference' && node.type.name !== 'footnote_definition') {
      return
    }
    const index = order.get(String(node.attrs.label ?? '').trim())
    if (!index) return
    decorations.push(
      Decoration.node(pos, pos + node.nodeSize, {
        'data-footnote-index': String(index),
        'aria-label': `脚注 ${index}`,
      }),
    )
  })

  return DecorationSet.create(doc, decorations)
}

/** DOM 标注（单测用）：与编辑器 decoration 同一套编号规则 */
export function annotateFootnoteDisplay(root: HTMLElement) {
  const order = new Map<string, number>()

  root.querySelectorAll<HTMLElement>('sup[data-type="footnote_reference"]').forEach((ref) => {
    const index = ensureIndex(order, ref.getAttribute('data-label') ?? '')
    if (!index) {
      delete ref.dataset.footnoteIndex
      ref.removeAttribute('aria-label')
      return
    }
    ref.dataset.footnoteIndex = String(index)
    ref.setAttribute('aria-label', `脚注 ${index}`)
  })

  root.querySelectorAll<HTMLElement>('dl[data-type="footnote_definition"]').forEach((def) => {
    const index = ensureIndex(order, def.getAttribute('data-label') ?? '')
    if (!index) {
      delete def.dataset.footnoteIndex
      def.removeAttribute('aria-label')
      return
    }
    def.dataset.footnoteIndex = String(index)
    def.setAttribute('aria-label', `脚注 ${index}`)
  })
}

export const footnoteDisplayPlugin = $prose(() => {
  return new Plugin({
    key: pluginKey,
    state: {
      init: (_, state) => buildFootnoteDecorations(state.doc),
      apply: (tr, decorations, _oldState, newState) => {
        if (!tr.docChanged) return decorations
        return buildFootnoteDecorations(newState.doc)
      },
    },
    props: {
      decorations(state) {
        return pluginKey.getState(state)
      },
    },
  })
})

export const footnoteDisplayPlugins: MilkdownPlugin[] = [footnoteDisplayPlugin]

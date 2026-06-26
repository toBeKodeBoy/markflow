import type { MilkdownPlugin } from '@milkdown/ctx'
import { schemaCtx } from '@milkdown/core'
import type { RemarkPluginRaw } from '@milkdown/transformer'
import { markRule } from '@milkdown/prose'
import { toggleMark } from '@milkdown/prose/commands'
import type { Node as ProseNode } from '@milkdown/prose/model'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { $inputRule, $markAttr, $markSchema, $prose, $remark, $shortcut } from '@milkdown/utils'

interface MdastNode {
  type: string
  value?: string
  children?: MdastNode[]
}

const OPEN_U_RE = /^<u(?:\s[^>]*)?>$/i
const CLOSE_U_RE = /^<\/u>$/i
const FULL_U_RE = /^<u(?:\s[^>]*)?>([\s\S]*)<\/u>$/i
const U_TEXT_RE = /<u>([^<]*)<\/u>/gi

interface UnderlineMatch {
  from: number
  to: number
  text: string
}

function findPlainUnderlineMatches(doc: ProseNode): UnderlineMatch[] {
  const matches: UnderlineMatch[] = []
  doc.descendants((node: ProseNode, pos: number) => {
    if (!node.isText || !node.text) return
    const $pos = doc.resolve(pos)
    if ($pos.parent.type.spec.code) return

    U_TEXT_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = U_TEXT_RE.exec(node.text)) !== null) {
      if (node.marks.some((m) => m.type.name === 'underline')) continue
      matches.push({
        from: pos + match.index,
        to: pos + match.index + match[0].length,
        text: match[1],
      })
    }
  })
  return matches.sort((a, b) => b.from - a.from)
}

/** micromark 常将 <u>text</u> 拆成 html + text + html 三个节点，合并为 underline */
function mergeUnderlineInChildren(children: MdastNode[]): MdastNode[] {
  const result: MdastNode[] = []
  let i = 0
  while (i < children.length) {
    const node = children[i]

    if (node.type === 'html' && typeof node.value === 'string') {
      const trimmed = node.value.trim()
      const full = FULL_U_RE.exec(trimmed)
      if (full) {
        result.push({
          type: 'underline',
          children: [{ type: 'text', value: full[1] }],
        })
        i++
        continue
      }
    }

    if (
      node.type === 'html' &&
      typeof node.value === 'string' &&
      OPEN_U_RE.test(node.value.trim())
    ) {
      const inner: MdastNode[] = []
      let j = i + 1
      let closed = false
      while (j < children.length) {
        const next = children[j]
        if (
          next.type === 'html' &&
          typeof next.value === 'string' &&
          CLOSE_U_RE.test(next.value.trim())
        ) {
          closed = true
          break
        }
        inner.push(next)
        j++
      }
      if (closed) {
        result.push({
          type: 'underline',
          children: inner.length
            ? mergeUnderlineInChildren(inner)
            : [{ type: 'text', value: '' }],
        })
        i = j + 1
        continue
      }
    }

    if (node.children) {
      node.children = mergeUnderlineInChildren(node.children)
    }
    result.push(node)
    i++
  }
  return result
}

function transformUnderlineHtml(tree: MdastNode) {
  if (tree.children) {
    tree.children = mergeUnderlineInChildren(tree.children)
  }
}

/** 将 mdast 内联 html 节点 `<u>...</u>` 转为 underline 节点 */
export const underlineRemark = $remark('underlineRemark', () => {
  const plugin: RemarkPluginRaw<unknown> = function underlineRemarkPlugin(this) {
    const data = this.data() as {
      toMarkdownExtensions?: Array<{ handlers: Record<string, unknown> }>
    }
    const extensions = data.toMarkdownExtensions ?? (data.toMarkdownExtensions = [])
    extensions.push({
      handlers: {
        underline(node: unknown, _parent: unknown, state: any, info: any) {
          const tracker = state.createTracker(info)
          const exit = state.enter('underline')
          let value = tracker.move('<u>')
          value += tracker.move(
            state.containerPhrasing(node, {
              before: value,
              after: '</u>',
              ...tracker.current(),
            })
          )
          value += tracker.move('</u>')
          exit()
          return value
        },
      },
    })

    return (tree) => {
      transformUnderlineHtml(tree as MdastNode)
    }
  }
  return plugin
})

export const underlineAttr = $markAttr('underline')

export const underlineSchema = $markSchema('underline', (ctx) => ({
  parseDOM: [
    { tag: 'u' },
    {
      style: 'text-decoration',
      getAttrs: (value) => ((value as string) === 'underline' ? {} : false),
    },
  ],
  toDOM: (mark) => ['u', ctx.get(underlineAttr.key)(mark)],
  parseMarkdown: {
    match: (node) => node.type === 'underline',
    runner: (state, node, markType) => {
      state.openMark(markType)
      state.next(node.children)
      state.closeMark(markType)
    },
  },
  toMarkdown: {
    match: (mark) => mark.type.name === 'underline',
    runner: (state, mark) => {
      state.withMark(mark, 'underline')
    },
  },
}))

/** 输入 `<u>文字</u>` 结束时自动转为下划线 mark */
export const underlineInputRule = $inputRule((ctx) => {
  return markRule(/<u>([^<\n]+?)<\/u>$/i, underlineSchema.type(ctx))
})

/** 将已输入的纯文本 `<u>...</u>` 实时转为下划线（无需刷新） */
export const underlineAutoConvertPlugin = $prose((ctx) => {
  const schema = ctx.get(schemaCtx)
  const underlineType = underlineSchema.type(ctx)

  return new Plugin({
    key: new PluginKey('underlineAutoConvert'),
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some((tr) => tr.docChanged)) return null

      const found = findPlainUnderlineMatches(newState.doc)
      if (!found.length) return null

      const tr = newState.tr
      for (const item of found) {
        tr.replaceWith(
          item.from,
          item.to,
          schema.text(item.text, [underlineType.create()])
        )
      }
      return tr
    },
  })
})

export const underlineShortcut = $shortcut((ctx) => ({
  'Ctrl-u': toggleMark(underlineSchema.type(ctx))
}))

export const underlineMarkPlugins: MilkdownPlugin[] = [
  underlineRemark,
  underlineAttr,
  underlineSchema,
  underlineInputRule,
  underlineAutoConvertPlugin,
  underlineShortcut,
].flat()

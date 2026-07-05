import type { MilkdownPlugin } from '@milkdown/ctx'
import { $prose } from '@milkdown/utils'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { HeadingSlugger } from '../utils/headingSlug'

const HEADING_SELECTOR = 'h1,h2,h3,h4,h5,h6'

/** 为 WYSIWYG 标题注入 id，与 marked 预览 / 目录锚点 slug 一致 */
function assignHeadingIds(root: HTMLElement) {
  const slugger = new HeadingSlugger()
  root.querySelectorAll(HEADING_SELECTOR).forEach((heading) => {
    heading.id = slugger.slug(heading.textContent ?? '')
  })
}

export const headingIdPlugin = $prose(() => {
  return new Plugin({
    key: new PluginKey('MARKFLOW_HEADING_IDS'),
    view(editorView) {
      const sync = () => assignHeadingIds(editorView.dom)
      sync()
      return {
        update(view, prevState) {
          if (view.state.doc !== prevState.doc) sync()
        },
      }
    },
  })
})

export const headingIdPlugins: MilkdownPlugin[] = [headingIdPlugin]

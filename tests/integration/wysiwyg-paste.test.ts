/**
 * 预览模式（WysiwygEditor）粘贴 Markdown 集成验证
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { editorViewCtx } from '@milkdown/core'
import { TextSelection } from '@milkdown/prose/state'
import type { EditorView } from '@milkdown/prose/view'
import { useNoteStore } from '@/stores/note'
import { mountWysiwygEditor } from '../helpers/mountWysiwygEditor'

const PASTE_MD = '# Test\n\n**bold**'
const LIST_MD = '- 列表1\n- 列表2\n- 列表3'

function mockClipboard(payload: {
  plain: string
  html?: string
  vscode?: { mode: string }
}) {
  return {
    getData(type: string) {
      if (type === 'text/plain') return payload.plain
      if (type === 'text/html') return payload.html ?? ''
      if (type === 'vscode-editor-data') {
        return payload.vscode ? JSON.stringify(payload.vscode) : ''
      }
      return ''
    },
  }
}

function dispatchPaste(el: Element, clipboardData: ReturnType<typeof mockClipboard>) {
  const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent
  Object.defineProperty(event, 'clipboardData', { value: clipboardData })
  el.dispatchEvent(event)
}

describe('WysiwygEditor 粘贴 Markdown', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('纯 text/plain 应解析为标题与粗体', async () => {
    const { wrapper, prose } = await mountWysiwygEditor('')
    ;(prose as HTMLElement).focus()
    dispatchPaste(prose, mockClipboard({ plain: PASTE_MD }))

    await flushPromises()
    await new Promise((r) => setTimeout(r, 200))

    expect(prose.querySelector('h1')?.textContent).toContain('Test')
    expect(prose.querySelector('strong')?.textContent).toBe('bold')
    expect(prose.textContent).not.toContain('# Test')

    const store = useNoteStore()
    expect(store.liveContent).toMatch(/# Test/)
    expect(store.liveContent).toMatch(/\*\*bold\*\*/)

    await wrapper.unmount()
  }, 15000)

  it('同时含 text/html 时仍应解析 Markdown 源码', async () => {
    const { wrapper, prose } = await mountWysiwygEditor('')
    ;(prose as HTMLElement).focus()
    dispatchPaste(prose, mockClipboard({
      plain: PASTE_MD,
      html: '<meta charset="utf-8"><pre># Test\n\n**bold**</pre>',
    }))

    await flushPromises()
    await new Promise((r) => setTimeout(r, 200))

    expect(prose.querySelector('h1')?.textContent).toContain('Test')
    expect(prose.querySelector('strong')?.textContent).toBe('bold')

    await wrapper.unmount()
  }, 15000)

  it('VS Code markdown 剪贴板应解析而非插入代码块', async () => {
    const { wrapper, prose } = await mountWysiwygEditor('')
    ;(prose as HTMLElement).focus()
    dispatchPaste(prose, mockClipboard({
      plain: PASTE_MD,
      vscode: { mode: 'markdown' },
    }))

    await flushPromises()
    await new Promise((r) => setTimeout(r, 200))

    expect(prose.querySelector('h1')?.textContent).toContain('Test')
    expect(prose.querySelector('pre')).toBeNull()

    await wrapper.unmount()
  }, 15000)

  it('代码块内粘贴列表源码时应作为纯文本写入代码块', async () => {
    const { wrapper, prose, store } = await mountWysiwygEditor('```text\nplaceholder\n```')
    const editor = (wrapper.vm as { editor?: { action: (runner: (ctx: unknown) => void) => void } }).editor

    let view: EditorView | undefined
    editor?.action((ctx) => {
      view = (ctx as { get: (value: typeof editorViewCtx) => EditorView }).get(editorViewCtx)
    })

    expect(view).toBeTruthy()

    let codeBlockPos = -1
    view!.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'code_block') return true
      codeBlockPos = pos
      return false
    })

    expect(codeBlockPos).toBeGreaterThanOrEqual(0)

    const start = codeBlockPos + 1
    const end = start + 'placeholder'.length
    view!.dispatch(view!.state.tr.setSelection(TextSelection.create(view!.state.doc, start, end)))
    view!.focus()

    dispatchPaste(prose, mockClipboard({
      plain: LIST_MD,
      html: '<ul><li>列表1</li><li>列表2</li><li>列表3</li></ul>',
    }))

    await flushPromises()
    await new Promise((r) => setTimeout(r, 200))

    expect(store.liveContent).toContain('```text\n- 列表1\n- 列表2\n- 列表3\n```')
    expect(store.liveContent).not.toContain('\n```\n\n- 列表1')

    await wrapper.unmount()
  }, 15000)

  it('跨出代码块的选区粘贴时不应误走代码块纯文本分支', async () => {
    const { wrapper, prose, store } = await mountWysiwygEditor('```text\nplaceholder\n```\n\nafter')
    const editor = (wrapper.vm as { editor?: { action: (runner: (ctx: unknown) => void) => void } }).editor

    let view: EditorView | undefined
    editor?.action((ctx) => {
      view = (ctx as { get: (value: typeof editorViewCtx) => EditorView }).get(editorViewCtx)
    })

    expect(view).toBeTruthy()

    let codeBlockPos = -1
    let paragraphPos = -1
    view!.state.doc.descendants((node, pos) => {
      if (node.type.name === 'code_block' && codeBlockPos < 0) {
        codeBlockPos = pos
      }
      if (node.type.name === 'paragraph' && node.textContent === 'after' && paragraphPos < 0) {
        paragraphPos = pos
      }
      return true
    })

    expect(codeBlockPos).toBeGreaterThanOrEqual(0)
    expect(paragraphPos).toBeGreaterThanOrEqual(0)

    const from = codeBlockPos + 1
    const to = paragraphPos + 1 + 'after'.length
    view!.dispatch(view!.state.tr.setSelection(TextSelection.create(view!.state.doc, from, to)))
    view!.focus()

    dispatchPaste(prose, mockClipboard({
      plain: LIST_MD,
      html: '<ul><li>列表1</li><li>列表2</li><li>列表3</li></ul>',
    }))

    await flushPromises()
    await new Promise((r) => setTimeout(r, 200))

    expect(store.liveContent).not.toContain('```text\n- 列表1\n- 列表2\n- 列表3\n```')
    expect(store.liveContent).not.toContain('```text\n* 列表1\n* 列表2\n* 列表3\n```')
    expect(store.liveContent).toContain('列表1')
    expect(store.liveContent).not.toContain('after')

    await wrapper.unmount()
  }, 15000)
})

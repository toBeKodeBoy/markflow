/**
 * TOC 标题解析测试 — 验证 parseHeadings 纯函数
 * @file tests/unit/composables/useTocHeadings.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { parseHeadings, useTocHeadings } from '../../../src/composables/useTocHeadings'
import { useNoteStore } from '../../../src/stores/note'
import { TOC_PARSE_DEBOUNCE_MS } from '../../../src/constants'
import type { Note } from '../../../src/types'

describe('parseHeadings', () => {
  it('应正确解析各级标题', () => {
    const content = `# H1
## H2
### H3
#### H4
##### H5
###### H6`
    const headings = parseHeadings(content)
    expect(headings).toHaveLength(6)
    expect(headings[0]).toEqual({ level: 1, text: 'H1', rawText: 'H1', line: 0, index: 0 })
    expect(headings[2]).toEqual({ level: 3, text: 'H3', rawText: 'H3', line: 2, index: 2 })
    expect(headings[5]).toEqual({ level: 6, text: 'H6', rawText: 'H6', line: 5, index: 5 })
  })

  it('应忽略非标题行', () => {
    const content = `普通段落文字
# 标题
另一个段落
### 子标题`
    const headings = parseHeadings(content)
    expect(headings).toHaveLength(2)
    expect(headings[0].text).toBe('标题')
    expect(headings[1].text).toBe('子标题')
  })

  it('应忽略 # 在行中非开头位置的情况', () => {
    const content = `不是 # 标题
也不是#标题`
    expect(parseHeadings(content)).toHaveLength(0)
  })

  it('应正确处理空内容', () => {
    expect(parseHeadings('')).toHaveLength(0)
  })

  it('应正确处理换行格式', () => {
    const content = '# Title\r\n## Sub\r\n\r\n### Deep'
    const headings = parseHeadings(content)
    expect(headings).toHaveLength(3)
    expect(headings[2].text).toBe('Deep')
  })

  it('trim 标题文本', () => {
    const content = '#   Spaces   '
    const headings = parseHeadings(content)
    expect(headings[0].text).toBe('Spaces')
  })

  it('大型文件应单遍扫描不 split', () => {
    // 构造一个包含标题的大文件
    const lines: string[] = []
    for (let i = 0; i < 10000; i++) {
      if (i % 1000 === 0) lines.push(`# Heading ${i}`)
      else lines.push(`line ${i}`)
    }
    const content = lines.join('\n')
    const headings = parseHeadings(content)
    expect(headings).toHaveLength(10)
    expect(headings[0].text).toBe('Heading 0')
    expect(headings[9].text).toBe('Heading 9000')
  })

  it('剥离标题文本中的内联 Markdown 语法', () => {
    const headings = parseHeadings('# **加粗** 标题\n## `代码` 标题')
    expect(headings[0].text).toBe('加粗 标题')
    expect(headings[1].text).toBe('代码 标题')
  })

  it('标题文本仅空白时剥离为空回退原文（空串）', () => {
    // 覆盖 parseHeadings 中 `stripInlineMarkdown(raw) || raw` 右侧回退分支
    const headings = parseHeadings('#   ')
    expect(headings).toHaveLength(1)
    expect(headings[0].text).toBe('')
  })

  it('rawText 保留原始标题文本，text 为剥离后展示文本', () => {
    // Major：rawText 用于算 slug（与 marked 预览侧一致），text 用于展示
    const headings = parseHeadings('# <u>下划线</u> 标题')
    expect(headings[0].rawText).toBe('<u>下划线</u> 标题')
    expect(headings[0].text).toBe('下划线 标题')
  })
})

describe('useTocHeadings', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('目录面板挂载时应立即解析标题（tocVisible 已为 true）', async () => {
    const store = useNoteStore()
    store.setLiveContent('# Alpha\n## Beta')
    store.setTocVisible(true)

    const Probe = defineComponent({
      setup() {
        const headings = useTocHeadings()
        return { headings }
      },
      template: '<span>{{ headings.length }}</span>'
    })

    const wrapper = mount(Probe)
    await nextTick()

    expect(wrapper.text()).toBe('2')
    expect(parseHeadings('# Alpha\n## Beta')).toHaveLength(2)
  })

  it('目录关闭时不解析，重新打开后应刷新', async () => {
    vi.useFakeTimers()
    const store = useNoteStore()
    store.setLiveContent('# One')
    store.setTocVisible(true)

    const Probe = defineComponent({
      setup() {
        const headings = useTocHeadings()
        return { headings }
      },
      template: '<span>{{ headings.length }}</span>'
    })

    const wrapper = mount(Probe)
    await nextTick()
    expect(wrapper.text()).toBe('1')

    store.setTocVisible(false)
    store.setLiveContent('# One\n# Two')
    await nextTick()
    expect(wrapper.text()).toBe('1')

    store.setTocVisible(true)
    await nextTick()
    expect(wrapper.text()).toBe('2')
    vi.useRealTimers()
  })

  it('切换 currentNote.id 后标题应刷新', async () => {
    // 覆盖 watch `() => store.currentNote?.id` 回调 -> refreshHeadings(true)
    vi.useFakeTimers()
    const store = useNoteStore()
    store.setLiveContent('# Alpha')
    store.setTocVisible(true)

    const Probe = defineComponent({
      setup() {
        const headings = useTocHeadings()
        return { headings }
      },
      template: '<span>{{ headings.length }}</span>'
    })

    const wrapper = mount(Probe)
    await nextTick()
    expect(wrapper.text()).toBe('1')

    // 切换到另一篇笔记，触发 currentNote.id watch（立即刷新）
    const next: Note = {
      id: 'note-2',
      title: 'B',
      content: '# Beta\n# Gamma',
      assetPathMode: 'internal',
      createdAt: 0,
      updatedAt: 0,
    }
    store.setActiveNote(next, '# Beta\n# Gamma')
    await nextTick()
    expect(wrapper.text()).toBe('2')

    wrapper.unmount()
    vi.useRealTimers()
  })

  it('内容变更后防抖定时器到期应刷新标题', async () => {
    // 覆盖 `debounceTimer = setTimeout(...)` 路径与防抖回调执行
    vi.useFakeTimers()
    const store = useNoteStore()
    store.setLiveContent('# One')
    store.setTocVisible(true)

    const Probe = defineComponent({
      setup() {
        const headings = useTocHeadings()
        return { headings }
      },
      template: '<span>{{ headings.length }}</span>'
    })

    const wrapper = mount(Probe)
    await nextTick()
    expect(wrapper.text()).toBe('1')

    // 内容变更触发防抖调度（tocVisible=true 走 setTimeout 路径）
    store.setLiveContent('# One\n# Two')
    await nextTick()
    // 防抖未到期，标题尚未更新
    expect(wrapper.text()).toBe('1')

    // 推进防抖定时器，parseNow 回调执行
    vi.advanceTimersByTime(TOC_PARSE_DEBOUNCE_MS)
    await nextTick()
    expect(wrapper.text()).toBe('2')

    wrapper.unmount()
    vi.useRealTimers()
  })

  it('卸载时应清理活跃的防抖定时器', async () => {
    // 覆盖 onBeforeUnmount 的 `if (debounceTimer) clearTimeout(debounceTimer)` 分支
    vi.useFakeTimers()
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')
    const store = useNoteStore()
    store.setLiveContent('# One')
    store.setTocVisible(true)

    const Probe = defineComponent({
      setup() {
        const headings = useTocHeadings()
        return { headings }
      },
      template: '<span>{{ headings.length }}</span>'
    })

    const wrapper = mount(Probe)
    await nextTick()

    // 触发防抖定时器（未到期），使 debounceTimer 非 null
    store.setLiveContent('# One\n# Two')
    await nextTick()

    // 卸载组件，触发 onBeforeUnmount -> clearTimeout(debounceTimer)
    wrapper.unmount()

    // 验证卸载期间 clearTimeout 被调用（清理活跃定时器）
    expect(clearTimeoutSpy).toHaveBeenCalled()

    vi.useRealTimers()
    clearTimeoutSpy.mockRestore()
  })

  it('挂载时无内容则标题为空', async () => {
    // 覆盖 refreshHeadings 中 `liveContent || currentNote?.content || ''` 全空回退路径
    const store = useNoteStore()
    store.setTocVisible(true)
    // 不设置 liveContent（''）、currentNote 为 null
    const Probe = defineComponent({
      setup() {
        const headings = useTocHeadings()
        return { headings }
      },
      template: '<span>{{ headings.length }}</span>'
    })
    const wrapper = mount(Probe)
    await nextTick()
    expect(wrapper.text()).toBe('0')
    wrapper.unmount()
  })

  it('目录关闭时挂载不解析标题（refreshHeadings 提前返回）', async () => {
    // 覆盖 refreshHeadings 的 `if (!store.tocVisible) return` 分支
    const store = useNoteStore()
    store.setLiveContent('# One\n# Two')
    store.setTocVisible(false)
    const Probe = defineComponent({
      setup() {
        const headings = useTocHeadings()
        return { headings }
      },
      template: '<span>{{ headings.length }}</span>'
    })
    const wrapper = mount(Probe)
    await nextTick()
    expect(wrapper.text()).toBe('0')
    wrapper.unmount()
  })

  it('liveContent 为空时回退到 currentNote.content', async () => {
    // 覆盖 `liveContent || currentNote?.content || ''` 中 currentNote?.content 真值路径
    const store = useNoteStore()
    const note: Note = {
      id: 'note-fb',
      title: 'FB',
      content: '# Alpha\n# Beta',
      assetPathMode: 'internal',
      createdAt: 0,
      updatedAt: 0,
    }
    // 第二参传空字符串：liveContent='' 但 currentNote.content 有值
    store.setActiveNote(note, '')
    store.setTocVisible(true)
    const Probe = defineComponent({
      setup() {
        const headings = useTocHeadings()
        return { headings }
      },
      template: '<span>{{ headings.length }}</span>'
    })
    const wrapper = mount(Probe)
    await nextTick()
    expect(wrapper.text()).toBe('2')
    wrapper.unmount()
  })

  it('防抖回调执行时目录已关闭则不更新标题', async () => {
    // 覆盖 parseNow 的 `if (!store.tocVisible) return` 分支（定时器回调时目录已关）
    vi.useFakeTimers()
    const store = useNoteStore()
    store.setLiveContent('# One')
    store.setTocVisible(true)
    const Probe = defineComponent({
      setup() {
        const headings = useTocHeadings()
        return { headings }
      },
      template: '<span>{{ headings.length }}</span>'
    })
    const wrapper = mount(Probe)
    await nextTick()
    expect(wrapper.text()).toBe('1')

    // 触发防抖定时器
    store.setLiveContent('# One\n# Two')
    await nextTick()
    // 关闭目录（防抖回调尚未执行）
    store.setTocVisible(false)
    await nextTick()
    // 推进定时器，parseNow 此时 tocVisible=false 直接 return
    vi.advanceTimersByTime(TOC_PARSE_DEBOUNCE_MS)
    await nextTick()
    expect(wrapper.text()).toBe('1')

    wrapper.unmount()
    vi.useRealTimers()
  })

  it('连续内容变更应重置防抖定时器', async () => {
    // 覆盖 scheduleParse 的 `if (debounceTimer) clearTimeout(debounceTimer)` 重置分支
    vi.useFakeTimers()
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')
    const store = useNoteStore()
    store.setLiveContent('# One')
    store.setTocVisible(true)
    const Probe = defineComponent({
      setup() {
        const headings = useTocHeadings()
        return { headings }
      },
      template: '<span>{{ headings.length }}</span>'
    })
    const wrapper = mount(Probe)
    await nextTick()

    // 第一次内容变更：设置防抖定时器
    store.setLiveContent('# One\n# Two')
    await nextTick()
    const callsAfterFirst = clearTimeoutSpy.mock.calls.length

    // 第二次内容变更：应清除上一个定时器并重置
    store.setLiveContent('# One\n# Two\n# Three')
    await nextTick()
    expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(callsAfterFirst)

    vi.advanceTimersByTime(TOC_PARSE_DEBOUNCE_MS)
    await nextTick()
    expect(wrapper.text()).toBe('3')

    wrapper.unmount()
    vi.useRealTimers()
    clearTimeoutSpy.mockRestore()
  })
})

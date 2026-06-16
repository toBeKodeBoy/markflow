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
    expect(headings[0]).toEqual({ level: 1, text: 'H1', line: 0, index: 0 })
    expect(headings[2]).toEqual({ level: 3, text: 'H3', line: 2, index: 2 })
    expect(headings[5]).toEqual({ level: 6, text: 'H6', line: 5, index: 5 })
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
})

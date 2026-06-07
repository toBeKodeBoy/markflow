/**
 * TOC 滚动工具测试
 * @file tests/unit/composables/useTocScroll.test.ts
 */
import { describe, it, expect, vi } from 'vitest'
import { scrollElementInContainer } from '../../../src/composables/useTocScroll'

describe('scrollElementInContainer', () => {
  it('应滚动容器使元素位于顶部（带边距）', () => {
    // 模拟 DOM 元素
    const container = {
      getBoundingClientRect: () => ({ top: 100, left: 0, right: 800, bottom: 600, width: 800, height: 500 } as DOMRect),
      scrollTop: 50,
      scrollTo: vi.fn(),
    } as any

    const element = {
      getBoundingClientRect: () => ({ top: 250, left: 0, right: 800, bottom: 270, width: 800, height: 20 } as DOMRect),
    } as any

    scrollElementInContainer(element, container, 20)

    // offset = 250 - 100 + 50 = 200, max(0, 200-20) = 180
    expect(container.scrollTo).toHaveBeenCalledWith({
      top: 180,
      behavior: 'smooth'
    })
  })

  it('偏移为 0 时不应为负', () => {
    const container = {
      getBoundingClientRect: () => ({ top: 0 } as DOMRect),
      scrollTop: 0,
      scrollTo: vi.fn(),
    } as any
    const element = {
      getBoundingClientRect: () => ({ top: 5 } as DOMRect),
    } as any

    scrollElementInContainer(element, container, 16)
    expect(container.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth'
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { findFragmentTarget, handlePreviewFragmentClick } from '../src/utils/previewFragmentNav'
import { scrollElementInContainer } from '../src/composables/useTocScroll'

vi.mock('../src/composables/useTocScroll', () => ({
  scrollElementInContainer: vi.fn(),
}))

describe('findFragmentTarget', () => {
  let root: HTMLElement

  beforeEach(() => {
    root = document.createElement('div')
    root.innerHTML = '<h2 id="section-a">A</h2><h2 id="项目介绍">B</h2>'
    document.body.appendChild(root)
  })

  it('finds heading by fragment id', () => {
    const target = findFragmentTarget(root, '#section-a')
    expect(target?.id).toBe('section-a')
  })

  it('finds Chinese heading ids', () => {
    const target = findFragmentTarget(root, '#项目介绍')
    expect(target?.id).toBe('项目介绍')
  })

  it('returns null for external links', () => {
    expect(findFragmentTarget(root, 'https://example.com')).toBeNull()
  })
})

describe('handlePreviewFragmentClick', () => {
  let root: HTMLElement

  beforeEach(() => {
    vi.mocked(scrollElementInContainer).mockClear()
    root = document.createElement('div')
    root.innerHTML = `
      <ul>
        <li><a href="#target-section" class="md-fragment-link">Go</a></li>
      </ul>
      <h2 id="target-section">Target</h2>
    `
    document.body.appendChild(root)
  })

  it('scrolls to heading inside preview container', () => {
    const link = root.querySelector('a')!
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'target', { value: link })

    const handled = handlePreviewFragmentClick(event, root)

    expect(handled).toBe(true)
    expect(event.defaultPrevented).toBe(true)
    expect(scrollElementInContainer).toHaveBeenCalledWith(
      root.querySelector('#target-section'),
      root
    )
  })

  it('ignores non-fragment links', () => {
    root.innerHTML = '<a href="https://example.com">External</a>'
    const link = root.querySelector('a')!
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'target', { value: link })

    expect(handlePreviewFragmentClick(event, root)).toBe(false)
    expect(scrollElementInContainer).not.toHaveBeenCalled()
  })
})

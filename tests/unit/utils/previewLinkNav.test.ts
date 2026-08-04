import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handlePreviewLinkClick, isSafePreviewLinkHref } from '../../../src/utils/previewLinkNav'

describe('isSafePreviewLinkHref', () => {
  it('allows safe protocols', () => {
    expect(isSafePreviewLinkHref('https://example.com')).toBe(true)
    expect(isSafePreviewLinkHref('http://example.com')).toBe(true)
    expect(isSafePreviewLinkHref('mailto:test@example.com')).toBe(true)
    expect(isSafePreviewLinkHref('file:///C:/demo/readme.md')).toBe(true)
    expect(isSafePreviewLinkHref('www.example.com/docs')).toBe(true)
  })

  it('rejects dangerous protocols', () => {
    expect(isSafePreviewLinkHref('javascript:alert(1)')).toBe(false)
    expect(isSafePreviewLinkHref('data:text/html;base64,PHNjcmlwdD4=')).toBe(false)
    expect(isSafePreviewLinkHref('blob:https://example.com/1')).toBe(false)
  })
})

describe('handlePreviewLinkClick', () => {
  let root: HTMLElement
  let notify: ReturnType<typeof vi.fn>
  let openExternalUrl: ReturnType<typeof vi.fn>
  let openLocalPath: ReturnType<typeof vi.fn>

  beforeEach(() => {
    root = document.createElement('div')
    document.body.appendChild(root)
    notify = vi.fn()
    openExternalUrl = vi.fn(() => true)
    openLocalPath = vi.fn(() => true)
  })

  function clickOn(href: string) {
    root.innerHTML = `<p><a href="${href}">link</a></p>`
    const anchor = root.querySelector('a')!
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'target', { value: anchor })
    return event
  }

  it('opens external links through bridge', () => {
    const event = clickOn('https://example.com')

    const result = handlePreviewLinkClick(event, {
      root,
      notify,
      openExternalUrl,
      openLocalPath,
    })

    expect(result.handled).toBe(true)
    expect(result.reason).toBe('external')
    expect(event.defaultPrevented).toBe(true)
    expect(openExternalUrl).toHaveBeenCalledWith('https://example.com')
    expect(openLocalPath).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
  })

  it('normalizes bare domain links before opening', () => {
    const event = clickOn('www.example.com/docs')

    const result = handlePreviewLinkClick(event, {
      root,
      notify,
      openExternalUrl,
      openLocalPath,
    })

    expect(result.handled).toBe(true)
    expect(result.reason).toBe('external')
    expect(openExternalUrl).toHaveBeenCalledWith('https://www.example.com/docs')
    expect(notify).not.toHaveBeenCalled()
  })

  it('opens file links through local path bridge', () => {
    const event = clickOn('file:///C:/demo/readme.md')

    const result = handlePreviewLinkClick(event, {
      root,
      notify,
      openExternalUrl,
      openLocalPath,
    })

    expect(result.handled).toBe(true)
    expect(result.reason).toBe('local-file')
    expect(openLocalPath).toHaveBeenCalledWith('file:///C:/demo/readme.md')
  })

  it('notifies when opening fails', () => {
    const event = clickOn('https://example.com')
    const failOpen = vi.fn(() => false)

    const result = handlePreviewLinkClick(event, {
      root,
      notify,
      openExternalUrl: failOpen,
      openLocalPath,
    })

    expect(result.handled).toBe(true)
    expect(result.reason).toBe('open-failed')
    expect(notify).toHaveBeenCalledWith('链接打开失败')
  })

  it('rejects dangerous links', () => {
    const event = clickOn('javascript:alert(1)')

    const result = handlePreviewLinkClick(event, {
      root,
      notify,
      openExternalUrl,
      openLocalPath,
    })

    expect(result.handled).toBe(true)
    expect(result.reason).toBe('unsupported')
    expect(notify).toHaveBeenCalled()
    expect(openExternalUrl).not.toHaveBeenCalled()
    expect(openLocalPath).not.toHaveBeenCalled()
  })

  it('requires modifier key when configured', () => {
    const event = clickOn('https://example.com')

    const result = handlePreviewLinkClick(
      event,
      {
        root,
        notify,
        openExternalUrl,
        openLocalPath,
      },
      {
        requireModifierKey: true,
      },
    )

    expect(result.handled).toBe(false)
    expect(openExternalUrl).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })
})

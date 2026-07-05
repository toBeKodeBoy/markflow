import { describe, it, expect } from 'vitest'
import {
  parseImageScale,
  formatScaleTitle,
  renderImageHtml,
  DEFAULT_IMAGE_SCALE,
} from '@/utils/imageScale'

describe('imageScale', () => {
  it('parses scale from title', () => {
    expect(parseImageScale(undefined)).toBe(DEFAULT_IMAGE_SCALE)
    expect(parseImageScale('scale:50')).toBe(50)
    expect(parseImageScale('scale:10')).toBe(10)
    expect(parseImageScale('scale:99')).toBe(DEFAULT_IMAGE_SCALE)
  })

  it('formats scale title', () => {
    expect(formatScaleTitle(30)).toBe('scale:30')
  })

  it('renders img html with scale class', () => {
    const html = renderImageHtml('https://example.com/a.png', 'alt', 'scale:30')
    expect(html).toContain('markflow-image-frame markflow-img-scale-30')
    expect(html).toContain('class="markflow-img"')
    expect(html).toContain('data-scale="30"')
    expect(html).toContain('title="scale:30"')
    expect(html).toContain('image-scale-badge')
  })
})

import { describe, it, expect, vi } from 'vitest'
import { importMarkdownImages } from '../../../src/utils/importMarkdownImages'

describe('importMarkdownImages', () => {
  it('应将相对图片路径改写为内部 asset 引用', async () => {
    const saveImage = vi.fn(async () => 'asset-1')

    const result = await importMarkdownImages(
      '# Title\n\n![图](./images/a.png)',
      [{ relPath: './images/a.png', base64: 'abc', mime: 'image/png' }],
      saveImage
    )

    expect(saveImage).toHaveBeenCalledWith('abc', 'image/png', 'a.png')
    expect(result.imagesImported).toBe(1)
    expect(result.content).toContain('markflow-asset://asset-1')
    expect(result.content).not.toContain('./images/a.png')
  })

  it('应复用同一路径图片，避免重复写入 asset', async () => {
    const saveImage = vi.fn(async () => 'asset-1')

    const result = await importMarkdownImages(
      '# Title\n\n![图1](./a.png)\n![图2](./a.png)',
      [
        { relPath: './a.png', base64: 'abc', mime: 'image/png' },
        { relPath: './a.png', base64: 'abc', mime: 'image/png' },
      ],
      saveImage
    )

    expect(saveImage).toHaveBeenCalledTimes(1)
    expect(result.imagesImported).toBe(1)
    expect(result.content).toContain('![图1](markflow-asset://asset-1)')
    expect(result.content).toContain('![图2](markflow-asset://asset-1)')
  })

  it('图片保存失败时应保留告警', async () => {
    const saveImage = vi.fn(async () => {
      throw new Error('quota')
    })

    const result = await importMarkdownImages(
      '![图](./a.png)',
      [{ relPath: './a.png', base64: 'abc', mime: 'image/png' }],
      saveImage
    )

    expect(result.imagesImported).toBe(0)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('a.png')
    expect(result.content).toContain('./a.png')
  })
})

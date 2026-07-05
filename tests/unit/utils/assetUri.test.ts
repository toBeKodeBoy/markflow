import { describe, it, expect } from 'vitest'
import {
  ASSET_URI_PREFIX,
  buildAssetMarkdown,
  parseAssetId,
  extractAssetIds,
  resolveAssetsInMarkdown,
  restoreAssetRefsInMarkdown,
} from '@/utils/assetUri'

describe('assetUri', () => {
  it('builds and parses asset markdown', () => {
    const md = buildAssetMarkdown('截图', 'abc123')
    expect(md).toBe('![截图](markflow-asset://abc123)')
    expect(parseAssetId('markflow-asset://abc123')).toBe('abc123')
    expect(parseAssetId('https://example.com/a.png')).toBeNull()
  })

  it('extracts asset ids from markdown', () => {
    const md = '文字\n![a](markflow-asset://id1)\n![b](markflow-asset://id2)'
    expect(extractAssetIds(md)).toEqual(['id1', 'id2'])
  })

  it('resolves asset refs to data urls', () => {
    const md = '![图](markflow-asset://x1)'
    const resolved = resolveAssetsInMarkdown(md, (id) =>
      id === 'x1' ? 'data:image/png;base64,AAA' : null
    )
    expect(resolved).toBe('![图](data:image/png;base64,AAA)')
  })

  it('builds asset markdown with optional scale', () => {
    // 默认 50% 时省略 title；非默认写入 scale title
    expect(buildAssetMarkdown('截图', 'abc123', 50)).toBe('![截图](markflow-asset://abc123)')
    expect(buildAssetMarkdown('截图', 'abc123', 100)).toBe('![截图](markflow-asset://abc123 "scale:100")')
  })

  it('resolves asset refs with scale title', () => {
    const md = '![image](markflow-asset://x1 "scale:30")'
    const resolved = resolveAssetsInMarkdown(md, (id) =>
      id === 'x1' ? 'data:image/png;base64,AAA' : null
    )
    expect(resolved).toBe('![image](data:image/png;base64,AAA "scale:30")')
  })

  it('restores data urls with scale title', () => {
    const md = '![图](data:image/png;base64,BBB "scale:50")'
    const restored = restoreAssetRefsInMarkdown(md, (b64) =>
      b64 === 'BBB' ? 'y2' : null
    )
    expect(restored).toBe(`![图](${ASSET_URI_PREFIX}y2 "scale:50")`)
  })

  it('restores data urls with optional title', () => {
    const md = '![图](data:image/png;base64,BBB "title")'
    const restored = restoreAssetRefsInMarkdown(md, (b64) =>
      b64 === 'BBB' ? 'y2' : null
    )
    expect(restored).toBe(`![图](${ASSET_URI_PREFIX}y2 "title")`)
  })
})

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { AssetRecord, ImageExportSettings } from '../../../src/types'
import { exportMarkdownAssets } from '../../../src/utils/exportMarkdownAssets'

const getAssetAsync = vi.fn()

vi.mock('../../../src/composables/useAssetStorage', () => ({
  getAssetStorage: () => ({
    getAssetAsync,
  }),
}))

describe('exportMarkdownAssets', () => {
  const originalBridge = window.markflow
  const originalFetch = globalThis.fetch
  const settings: ImageExportSettings = {
    mode: 'note-assets-folder',
    customTemplate: './${filename}.assets',
    fileNameTemplate: '${filename}-${index}',
    overwriteStrategy: 'rename',
    downloadRemoteImages: true,
    syncUnusedAssets: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    getAssetAsync.mockReset()
    window.markflow = {
      ...originalBridge,
      ensureDirectory: vi.fn(() => ({ ok: true })),
      writeAssetFile: vi.fn(() => ({ ok: true, path: 'ok' })),
    }
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('exports assets to note assets folder and rewrites markdown references', async () => {
    const asset: AssetRecord = {
      meta: {
        id: 'asset-1',
        mimeType: 'image/png',
        size: 12,
        filename: 'diagram.png',
        createdAt: Date.now(),
      },
      data: 'Zm9v',
    }
    getAssetAsync.mockResolvedValue(asset)

    const result = await exportMarkdownAssets({
      markdown: 'before ![图](markflow-asset://asset-1) after',
      markdownFilePath: 'D:\\docs\\note.md',
      noteTitle: 'note',
      settings,
    })

    expect(window.markflow.ensureDirectory).toHaveBeenCalledWith('D:\\docs\\note.assets')
    expect(window.markflow.writeAssetFile).toHaveBeenCalledWith(
      'D:\\docs\\note.assets\\diagram-1.png',
      'Zm9v'
    )
    expect(result.markdown).toBe('before ![图](./note.assets/diagram-1.png) after')
    expect(result.exportedCount).toBe(1)
    expect(result.syncedUnusedCount).toBe(0)
    expect(result.warnings).toEqual([])
  })

  it('keeps missing assets unchanged and reports warnings', async () => {
    getAssetAsync.mockResolvedValue(null)

    const result = await exportMarkdownAssets({
      markdown: '![图](markflow-asset://missing)',
      markdownFilePath: 'D:\\docs\\note.md',
      noteTitle: 'note',
      settings: {
        ...settings,
        mode: 'same-folder',
      },
    })

    expect(window.markflow.writeAssetFile).not.toHaveBeenCalled()
    expect(result.markdown).toBe('![图](markflow-asset://missing)')
    expect(result.exportedCount).toBe(0)
    expect(result.syncedUnusedCount).toBe(0)
    expect(result.warnings[0]).toContain('missing')
  })

  it('reuses exported file when the same asset is referenced multiple times', async () => {
    const asset: AssetRecord = {
      meta: {
        id: 'asset-1',
        mimeType: 'image/png',
        size: 12,
        filename: 'diagram.png',
        createdAt: Date.now(),
      },
      data: 'Zm9v',
    }
    getAssetAsync.mockResolvedValue(asset)

    const result = await exportMarkdownAssets({
      markdown: '![一](markflow-asset://asset-1) and ![二](markflow-asset://asset-1)',
      markdownFilePath: 'D:\\docs\\note.md',
      noteTitle: 'note',
      settings,
    })

    expect(window.markflow.writeAssetFile).toHaveBeenCalledTimes(1)
    expect(result.markdown).toBe(
      '![一](./note.assets/diagram-1.png) and ![二](./note.assets/diagram-1.png)'
    )
    expect(result.exportedCount).toBe(1)
    expect(result.syncedUnusedCount).toBe(0)
  })

  it('downloads remote images during export and rewrites markdown references', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'image/png' }),
      blob: () => Promise.resolve(new Blob(['remote'], { type: 'image/png' })),
    } as Response)

    const result = await exportMarkdownAssets({
      markdown: '![remote](https://example.com/assets/demo.png)',
      markdownFilePath: 'D:\\docs\\note.md',
      noteTitle: 'note',
      settings,
    })

    expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com/assets/demo.png')
    expect(window.markflow.writeAssetFile).toHaveBeenCalledWith(
      'D:\\docs\\note.assets\\demo-1.png',
      expect.any(String)
    )
    expect(result.markdown).toBe('![remote](./note.assets/demo-1.png)')
    expect(result.exportedCount).toBe(1)
    expect(result.syncedUnusedCount).toBe(0)
    expect(result.warnings).toEqual([])
  })

  it('keeps remote image unchanged when download fails and reports warnings', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers(),
    } as Response)

    const result = await exportMarkdownAssets({
      markdown: '![remote](https://example.com/missing.png)',
      markdownFilePath: 'D:\\docs\\note.md',
      noteTitle: 'note',
      settings,
    })

    expect(window.markflow.writeAssetFile).not.toHaveBeenCalled()
    expect(result.markdown).toBe('![remote](https://example.com/missing.png)')
    expect(result.exportedCount).toBe(0)
    expect(result.syncedUnusedCount).toBe(0)
    expect(result.warnings[0]).toContain('https://example.com/missing.png')
  })

  it('syncs unused managed assets into the _unused folder', async () => {
    const used: AssetRecord = {
      meta: {
        id: 'asset-used',
        mimeType: 'image/png',
        size: 12,
        filename: 'used.png',
        createdAt: Date.now(),
      },
      data: 'dXNlZA==',
    }
    const unused: AssetRecord = {
      meta: {
        id: 'asset-unused',
        mimeType: 'image/png',
        size: 12,
        filename: 'unused.png',
        createdAt: Date.now(),
      },
      data: 'dW51c2Vk',
    }
    getAssetAsync.mockImplementation(async (id: string) => {
      if (id === 'asset-used') return used
      if (id === 'asset-unused') return unused
      return null
    })

    const result = await exportMarkdownAssets({
      markdown: '![used](markflow-asset://asset-used)',
      markdownFilePath: 'D:\\docs\\note.md',
      noteTitle: 'note',
      managedAssetIds: ['asset-used', 'asset-unused'],
      settings,
    })

    expect(window.markflow.writeAssetFile).toHaveBeenCalledWith(
      'D:\\docs\\note.assets\\_unused\\unused-1.png',
      'dW51c2Vk'
    )
    expect(result.markdown).toBe('![used](./note.assets/used-1.png)')
    expect(result.exportedCount).toBe(1)
    expect(result.syncedUnusedCount).toBe(1)
  })
})

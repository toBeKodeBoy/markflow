import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAssetStorage, resetAssetStorageSingleton } from '@/composables/useAssetStorage'
import type { AssetRecord } from '@/types/asset'

describe('useAssetStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    resetAssetStorageSingleton()
  })

  it('通过 uTools bridge 保存并读取 asset', async () => {
    const storage = useAssetStorage()
    const record: AssetRecord = {
      meta: {
        id: 'img1',
        mimeType: 'image/png',
        size: 100,
        createdAt: Date.now(),
      },
      data: 'aGVsbG8=',
    }

    await storage.saveAssetAsync('img1', record)
    expect(window.markflow.saveAsset).toHaveBeenCalled()
    expect(window.markflow.saveAssetIndex).toHaveBeenCalled()

    const loaded = storage.getAsset('img1')
    expect(loaded?.data).toBe('aGVsbG8=')
    expect(storage.getDataUrl('img1')).toBe('data:image/png;base64,aGVsbG8=')
  })

  it('gcOrphans 应删除无引用的 asset', async () => {
    const storage = useAssetStorage()
    const record: AssetRecord = {
      meta: { id: 'orphan', mimeType: 'image/png', size: 1, createdAt: 0 },
      data: 'b64',
    }
    await storage.saveAssetAsync('orphan', record)

    const removed = await storage.gcOrphans(['![x](markflow-asset://used)'])
    expect(removed).toBe(1)
    expect(storage.getAsset('orphan')).toBeNull()
  })
})

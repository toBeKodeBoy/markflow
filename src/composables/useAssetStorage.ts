import type { AssetIndexItem, AssetRecord } from '../types/asset'
import { showAppNotification } from '../utils/notify'
import { generateAssetId, ASSET_ID_SCAN_RE } from '../utils/assetUri'
import { blobToBase64, compressImage } from '../utils/imageCompress'

const INDEX_KEY = 'markflow_asset_index'
const DB_NAME = 'markflow_assets'
const DB_VERSION = 1
const STORE_RECORDS = 'records'

const isuTools = () => typeof window !== 'undefined' && typeof window.markflow !== 'undefined'

function handleAssetError(action: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err)
  const isQuota = msg.includes('quota') || msg.includes('QuotaExceeded')
  showAppNotification(
    isQuota
      ? '存储空间不足，图片保存失败。请删除部分笔记或图片后重试。'
      : `图片${action}失败：${msg}`
  )
}

function readIndexFromLocalStorage(): AssetIndexItem[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]') as AssetIndexItem[]
  } catch {
    return []
  }
}

function writeIndexToLocalStorage(index: AssetIndexItem[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index))
  } catch (err) {
    handleAssetError('索引保存', err)
    throw err
  }
}

function openAssetDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB 打开失败'))
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        db.createObjectStore(STORE_RECORDS)
      }
    }
    req.onsuccess = () => resolve(req.result)
  })
}

async function idbGetAsset(id: string): Promise<AssetRecord | null> {
  const db = await openAssetDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECORDS, 'readonly')
    const req = tx.objectStore(STORE_RECORDS).get(id)
    req.onsuccess = () => resolve((req.result as AssetRecord | undefined) ?? null)
    req.onerror = () => reject(req.error ?? new Error('读取图片失败'))
    tx.oncomplete = () => db.close()
  })
}

async function idbSaveAsset(id: string, record: AssetRecord): Promise<void> {
  const db = await openAssetDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECORDS, 'readwrite')
    tx.objectStore(STORE_RECORDS).put(record, id)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error ?? new Error('保存图片失败'))
  })
}

async function idbRemoveAsset(id: string): Promise<void> {
  const db = await openAssetDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECORDS, 'readwrite')
    tx.objectStore(STORE_RECORDS).delete(id)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error ?? new Error('删除图片失败'))
  })
}

/** 内存缓存：assetId → data URL */
const dataUrlCache = new Map<string, string>()
/** base64 → assetId，用于 restoreAssetRefs */
const dataLookupCache = new Map<string, string>()

function cacheRecord(record: AssetRecord): void {
  const dataUrl = `data:${record.meta.mimeType};base64,${record.data}`
  dataUrlCache.set(record.meta.id, dataUrl)
  dataLookupCache.set(record.data, record.meta.id)
}

function uncacheRecord(id: string, data?: string): void {
  dataUrlCache.delete(id)
  if (data) dataLookupCache.delete(data)
}

function upsertIndexItem(index: AssetIndexItem[], item: AssetIndexItem): AssetIndexItem[] {
  const next = index.filter((i) => i.id !== item.id)
  next.push(item)
  return next
}

function removeIndexItem(index: AssetIndexItem[], id: string): AssetIndexItem[] {
  return index.filter((i) => i.id !== id)
}

export function useAssetStorage() {
  const bridge = isuTools() ? window.markflow : null

  function getAssetIndex(): AssetIndexItem[] {
    if (bridge?.getAssetIndex) return bridge.getAssetIndex()
    return readIndexFromLocalStorage()
  }

  function saveAssetIndex(index: AssetIndexItem[]): void {
    if (bridge?.saveAssetIndex) {
      try {
        bridge.saveAssetIndex(index)
      } catch (err) {
        handleAssetError('索引保存', err)
        throw err
      }
      return
    }
    writeIndexToLocalStorage(index)
  }

  function getAsset(id: string): AssetRecord | null {
    if (bridge?.getAsset) {
      const record = bridge.getAsset(id)
      if (record) cacheRecord(record)
      return record
    }
    return null
  }

  async function getAssetAsync(id: string): Promise<AssetRecord | null> {
    if (bridge?.getAsset) {
      const record = bridge.getAsset(id)
      if (record) cacheRecord(record)
      return record
    }
    const record = await idbGetAsset(id)
    if (record) cacheRecord(record)
    return record
  }

  async function saveAssetAsync(id: string, record: AssetRecord): Promise<void> {
    try {
      if (bridge?.saveAsset) {
        bridge.saveAsset(id, record)
      } else {
        await idbSaveAsset(id, record)
      }
    } catch (err) {
      handleAssetError('保存', err)
      throw err
    }
    cacheRecord(record)
    const index = upsertIndexItem(getAssetIndex(), {
      id: record.meta.id,
      mimeType: record.meta.mimeType,
      size: record.meta.size,
      createdAt: record.meta.createdAt,
    })
    saveAssetIndex(index)
  }

  function removeAsset(id: string): void {
    const existing = getAsset(id)
    if (bridge?.removeAsset) {
      bridge.removeAsset(id)
    }
    const index = removeIndexItem(getAssetIndex(), id)
    saveAssetIndex(index)
    uncacheRecord(id, existing?.data)
  }

  async function removeAssetAsync(id: string): Promise<void> {
    const existing = await getAssetAsync(id)
    if (bridge?.removeAsset) {
      bridge.removeAsset(id)
    } else {
      await idbRemoveAsset(id)
    }
    const index = removeIndexItem(getAssetIndex(), id)
    saveAssetIndex(index)
    uncacheRecord(id, existing?.data)
  }

  function getDataUrl(id: string): string | null {
    const cached = dataUrlCache.get(id)
    if (cached) return cached
    const record = getAsset(id)
    if (!record) return null
    return dataUrlCache.get(id) ?? null
  }

  async function getDataUrlAsync(id: string): Promise<string | null> {
    const cached = dataUrlCache.get(id)
    if (cached) return cached
    const record = await getAssetAsync(id)
    if (!record) return null
    return dataUrlCache.get(id) ?? null
  }

  function findIdByData(base64: string): string | null {
    return dataLookupCache.get(base64) ?? null
  }

  async function findIdByDataAsync(base64: string): Promise<string | null> {
    const cached = dataLookupCache.get(base64)
    if (cached) return cached
    const index = getAssetIndex()
    for (const item of index) {
      const record = await getAssetAsync(item.id)
      if (record?.data === base64) return record.meta.id
    }
    return null
  }

  async function saveFromBlob(input: File | Blob, filename?: string): Promise<string> {
    const compressed = await compressImage(input)
    const data = await blobToBase64(compressed.blob)
    const id = generateAssetId()
    const record: AssetRecord = {
      meta: {
        id,
        mimeType: compressed.mimeType,
        size: compressed.size,
        width: compressed.width,
        height: compressed.height,
        filename,
        createdAt: Date.now(),
      },
      data,
    }
    await saveAssetAsync(id, record)
    return id
  }

  async function saveFromFile(file: File): Promise<string> {
    return saveFromBlob(file, file.name)
  }

  function getTotalSize(): number {
    return getAssetIndex().reduce((sum, item) => sum + item.size, 0)
  }

  async function gcOrphans(allMarkdown: string[]): Promise<number> {
    const referenced = new Set<string>()
    const re = new RegExp(ASSET_ID_SCAN_RE.source, 'g')
    for (const md of allMarkdown) {
      let m: RegExpExecArray | null
      while ((m = re.exec(md)) !== null) {
        if (m[1]) referenced.add(m[1])
      }
    }

    const index = getAssetIndex()
    let removed = 0
    for (const item of index) {
      if (referenced.has(item.id)) continue
      if (bridge?.removeAsset) {
        removeAsset(item.id)
      } else {
        await removeAssetAsync(item.id)
      }
      removed++
    }
    return removed
  }

  async function clearAllAssets(): Promise<void> {
    const index = getAssetIndex()
    for (const item of index) {
      if (bridge?.removeAsset) {
        bridge.removeAsset(item.id)
      } else {
        await idbRemoveAsset(item.id)
      }
    }
    saveAssetIndex([])
    dataUrlCache.clear()
    dataLookupCache.clear()
  }

  async function warmCache(): Promise<void> {
    const index = getAssetIndex()
    await Promise.all(index.map((item) => getAssetAsync(item.id)))
  }

  return {
    getAssetIndex,
    getAsset,
    getAssetAsync,
    saveAssetAsync,
    saveFromFile,
    saveFromBlob,
    getDataUrl,
    getDataUrlAsync,
    findIdByData,
    findIdByDataAsync,
    removeAsset,
    removeAssetAsync,
    clearAllAssets,
    getTotalSize,
    gcOrphans,
    warmCache,
  }
}

export type AssetStorage = ReturnType<typeof useAssetStorage>

let sharedStorage: AssetStorage | null = null

export function resetAssetStorageSingleton(): void {
  sharedStorage = null
}

export function getAssetStorage(): AssetStorage {
  if (!sharedStorage) sharedStorage = useAssetStorage()
  return sharedStorage
}

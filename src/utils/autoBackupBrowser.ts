import { AUTO_BACKUP_FILE_PATTERN } from './autoBackup'

type BrowserDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
}

function asBrowserDirectoryHandle(handle: FileSystemDirectoryHandle): BrowserDirectoryHandle {
  return handle as BrowserDirectoryHandle
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<BrowserDirectoryHandle>
  }
}

const DB_NAME = 'markflow_auto_backup'
const DB_VERSION = 1
const STORE = 'handles'
const HANDLE_KEY = 'directory'

let cachedDirectoryHandle: BrowserDirectoryHandle | null = null

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB 打开失败'))
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
  })
}

async function readStoredHandle(): Promise<BrowserDirectoryHandle | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(HANDLE_KEY)
    req.onsuccess = () => {
      const handle = req.result as FileSystemDirectoryHandle | undefined
      resolve(handle ? asBrowserDirectoryHandle(handle) : null)
    }
    req.onerror = () => reject(req.error ?? new Error('读取备份目录失败'))
  })
}

async function writeStoredHandle(handle: BrowserDirectoryHandle): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).put(handle, HANDLE_KEY)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error ?? new Error('保存备份目录失败'))
  })
}

async function ensureWritePermission(handle: BrowserDirectoryHandle): Promise<boolean> {
  const current = await handle.queryPermission({ mode: 'readwrite' })
  if (current === 'granted') return true
  const requested = await handle.requestPermission({ mode: 'readwrite' })
  return requested === 'granted'
}

/** 浏览器是否支持 File System Access API 自动备份 */
export function supportsBrowserAutoBackup(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

/** 恢复已授权的浏览器备份目录句柄 */
export async function restoreBrowserBackupDirectory(): Promise<BrowserDirectoryHandle | null> {
  if (!supportsBrowserAutoBackup()) return null
  if (cachedDirectoryHandle) return cachedDirectoryHandle

  try {
    const handle = await readStoredHandle()
    if (!handle) return null
    if (!(await ensureWritePermission(handle))) return null
    cachedDirectoryHandle = handle
    return handle
  } catch {
    return null
  }
}

/** 选择浏览器备份目录（返回目录名用于展示） */
export async function selectBrowserBackupDirectory(): Promise<string | null> {
  if (!supportsBrowserAutoBackup()) return null

  const picker = window.showDirectoryPicker
  if (!picker) return null

  const handle = asBrowserDirectoryHandle(await picker({ mode: 'readwrite' }))
  if (!(await ensureWritePermission(handle))) return null

  cachedDirectoryHandle = handle
  await writeStoredHandle(handle)
  return handle.name
}

/** 静默写入浏览器备份目录 */
export async function writeBrowserBackupFile(
  filename: string,
  content: string
): Promise<{ ok: true; path: string } | { ok: false; reason: 'error' }> {
  try {
    const handle = cachedDirectoryHandle ?? (await restoreBrowserBackupDirectory())
    if (!handle) return { ok: false, reason: 'error' }

    const fileHandle = await handle.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
    return { ok: true, path: `${handle.name}/${filename}` }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/** 清理浏览器备份目录中的旧自动备份文件 */
export async function cleanBrowserOldBackupFiles(
  maxCopies: number
): Promise<{ ok: true; deleted: number } | { ok: false; reason: 'error' }> {
  try {
    if (maxCopies <= 0) return { ok: true, deleted: 0 }

    const handle = cachedDirectoryHandle ?? (await restoreBrowserBackupDirectory())
    if (!handle) return { ok: false, reason: 'error' }

    const entries: { name: string; mtime: number }[] = []
    for await (const [name, entry] of handle.entries()) {
      if (entry.kind !== 'file' || !AUTO_BACKUP_FILE_PATTERN.test(name)) continue
      const file = await (entry as FileSystemFileHandle).getFile()
      entries.push({ name, mtime: file.lastModified })
    }

    entries.sort((a, b) => b.mtime - a.mtime)
    const toDelete = entries.slice(maxCopies)
    for (const item of toDelete) {
      await handle.removeEntry(item.name)
    }
    return { ok: true, deleted: toDelete.length }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/** 测试/重置时清除缓存句柄 */
export function resetBrowserBackupDirectoryCache(): void {
  cachedDirectoryHandle = null
}

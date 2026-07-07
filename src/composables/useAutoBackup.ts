import type { AutoBackupSettings } from '../types'
import { readonly, ref } from 'vue'
import { useStorage } from './useStorage'
import { useNoteStore } from '../stores/note'
import {
  formatAutoBackupFilename,
  isAutoBackupDue,
  isValidUtoolsBackupDirectory,
  normalizeAutoBackupSettings,
} from '../utils/autoBackup'
import {
  cleanBrowserOldBackupFiles,
  restoreBrowserBackupDirectory,
  selectBrowserBackupDirectory,
  supportsBrowserAutoBackup,
  writeBrowserBackupFile,
} from '../utils/autoBackupBrowser'
import { showAppNotification } from '../utils/notify'

const CHECK_INTERVAL_MS = 5 * 60 * 1000
export const AUTO_BACKUP_BRIDGE_VERSION = 1

let checkTimer: ReturnType<typeof setInterval> | null = null
const backupRunning = ref(false)

export function isUtoolsEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof window.markflow !== 'undefined'
}

export function getUtoolsAutoBackupCapabilities() {
  if (!isUtoolsEnvironment()) return null
  const bridge = window.markflow
  if (typeof bridge.getAutoBackupCapabilities === 'function') {
    return bridge.getAutoBackupCapabilities()
  }
  const available =
    typeof bridge.selectBackupDirectory === 'function' &&
    typeof bridge.writeBackupFileSilent === 'function' &&
    typeof bridge.cleanOldBackupFiles === 'function'
  return { version: available ? 1 : 0, available, isDev: false }
}

export function hasUtoolsAutoBackupBridge(): boolean {
  const caps = getUtoolsAutoBackupCapabilities()
  return !!caps?.available
}

/** 自动备份是否可用（uTools 优先，纯浏览器才走 File System Access API） */
export function isAutoBackupAvailable(): boolean {
  if (isUtoolsEnvironment()) {
    return hasUtoolsAutoBackupBridge()
  }
  return supportsBrowserAutoBackup()
}

export function getAutoBackupUnavailableReason(): string | null {
  if (isUtoolsEnvironment()) {
    const caps = getUtoolsAutoBackupCapabilities()
    if (!caps?.available) {
      return '自动备份接口未加载：请在 uTools 开发者工具中重新加载插件，或执行 npm run build 后重启 uTools。'
    }
    return null
  }
  if (!isAutoBackupAvailable()) {
    return '当前浏览器不支持目录访问 API，请使用 uTools 或 Chromium 系浏览器。'
  }
  return null
}

function getBridge() {
  return typeof window !== 'undefined' ? window.markflow : undefined
}

function sanitizeUtoolsDirectoryPath(dirPath?: string | null): string | undefined {
  if (!dirPath || !isValidUtoolsBackupDirectory(dirPath)) return undefined
  return dirPath
}

function getUtoolsDefaultDirectory(): string | null {
  const bridge = getBridge()
  if (!bridge?.getDefaultBackupDirectory) return null
  const dir = bridge.getDefaultBackupDirectory()
  return dir && isValidUtoolsBackupDirectory(dir) ? dir : null
}

export function useAutoBackup() {
  const storage = useStorage()
  const store = useNoteStore()

  function getSettings(): AutoBackupSettings {
    const settings = normalizeAutoBackupSettings(storage.getSettings().autoBackup)
    if (!hasUtoolsAutoBackupBridge()) return settings
    return {
      ...settings,
      directoryPath: sanitizeUtoolsDirectoryPath(settings.directoryPath),
    }
  }

  function saveSettings(partial: Partial<AutoBackupSettings>): AutoBackupSettings {
    const current = storage.getSettings()
    const merged = { ...current.autoBackup, ...partial }
    if (hasUtoolsAutoBackupBridge()) {
      merged.directoryPath = sanitizeUtoolsDirectoryPath(merged.directoryPath)
    }
    const next = normalizeAutoBackupSettings(merged)
    storage.saveSettings({ ...current, autoBackup: next })
    return next
  }

  async function selectDirectory(): Promise<string | null> {
    if (hasUtoolsAutoBackupBridge()) {
      const path = getBridge()?.selectBackupDirectory() ?? null
      if (!path || !isValidUtoolsBackupDirectory(path)) {
        showAppNotification('未选择有效的备份目录')
        return null
      }
      return path
    }
    if (!isUtoolsEnvironment() && supportsBrowserAutoBackup()) {
      return selectBrowserBackupDirectory()
    }
    return null
  }

  async function useDefaultDirectory(): Promise<string | null> {
    const dir = getUtoolsDefaultDirectory()
    if (!dir) {
      showAppNotification('无法创建默认备份目录')
      return null
    }
    return dir
  }

  async function ensureBackupDirectory(options?: { prompt?: boolean }): Promise<string | null> {
    const current = sanitizeUtoolsDirectoryPath(getSettings().directoryPath)
    if (current) return current

    if (hasUtoolsAutoBackupBridge()) {
      const defaultDir = getUtoolsDefaultDirectory()
      if (defaultDir) return defaultDir
      if (options?.prompt === false) return null
      return selectDirectory()
    }

    if (!isUtoolsEnvironment() && supportsBrowserAutoBackup()) {
      return selectBrowserBackupDirectory()
    }

    return null
  }

  async function runBackup(options?: { force?: boolean }): Promise<boolean> {
    if (backupRunning.value) {
      if (options?.force) {
        showAppNotification('备份正在进行中，请稍候')
      }
      return false
    }

    const cfg = getSettings()
    if (!cfg.enabled && !options?.force) return false
    if (!isAutoBackupAvailable()) {
      showAppNotification(getAutoBackupUnavailableReason() ?? '当前环境不支持自动备份')
      return false
    }

    let directoryPath = cfg.directoryPath
    if (!directoryPath) {
      directoryPath = (await ensureBackupDirectory({ prompt: false })) ?? undefined
    }
    if (!directoryPath) {
      showAppNotification('请先选择或设置自动备份目录')
      return false
    }
    if (hasUtoolsAutoBackupBridge() && !isValidUtoolsBackupDirectory(directoryPath)) {
      showAppNotification('备份目录无效，请重新选择目录或使用默认目录')
      return false
    }
    if (!options?.force && !isAutoBackupDue(cfg.lastBackupAt, cfg.intervalHours)) {
      return false
    }

    if (directoryPath !== cfg.directoryPath) {
      saveSettings({ directoryPath })
    }

    backupRunning.value = true
    saveSettings({ lastBackupStatus: 'running', lastBackupError: undefined })

    try {
      if (!hasUtoolsAutoBackupBridge() && supportsBrowserAutoBackup()) {
        const restored = await restoreBrowserBackupDirectory()
        if (!restored) {
          throw new Error('备份目录未授权，请重新选择目录')
        }
      }

      const backup = await store.exportLibraryBackup()
      const json = JSON.stringify(backup, null, 2)
      const filename = formatAutoBackupFilename(backup.exportedAt)

      let writeResult: { ok: true; path: string } | { ok: false; reason: 'error' }
      let cleanResult: { ok: true; deleted: number } | { ok: false; reason: 'error' }

      if (hasUtoolsAutoBackupBridge()) {
        const bridge = getBridge()
        if (!bridge) throw new Error('uTools 桥接不可用')
        writeResult = bridge.writeBackupFileSilent(directoryPath, filename, json)
        cleanResult = bridge.cleanOldBackupFiles(directoryPath, cfg.maxCopies)
      } else {
        writeResult = await writeBrowserBackupFile(filename, json)
        cleanResult = await cleanBrowserOldBackupFiles(cfg.maxCopies)
      }

      if (!writeResult.ok) {
        throw new Error('写入备份文件失败')
      }

      const cleanupFailed = !cleanResult.ok

      saveSettings({
        lastBackupAt: backup.exportedAt,
        lastBackupStatus: 'success',
        lastBackupPath: writeResult.path,
        lastBackupError: cleanupFailed ? '清理旧备份失败' : undefined,
      })
      if (cleanupFailed) {
        showAppNotification(`自动备份已完成，但清理旧备份失败：${writeResult.path}`)
      } else {
        showAppNotification(`自动备份已完成：${writeResult.path}`)
      }
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : '自动备份失败'
      saveSettings({
        lastBackupStatus: 'error',
        lastBackupError: message,
      })
      showAppNotification(message)
      return false
    } finally {
      backupRunning.value = false
    }
  }

  async function tryRunScheduledBackup(): Promise<void> {
    const cfg = getSettings()
    if (!cfg.enabled) return
    await runBackup()
  }

  function startScheduler(): void {
    stopScheduler()
    void tryRunScheduledBackup()
    checkTimer = setInterval(() => void tryRunScheduledBackup(), CHECK_INTERVAL_MS)
  }

  function stopScheduler(): void {
    if (checkTimer) {
      clearInterval(checkTimer)
      checkTimer = null
    }
  }

  function restartScheduler(): void {
    startScheduler()
  }

  function openBackupDirectory(): boolean {
    const dir = getSettings().directoryPath
    if (!dir) return false
    return getBridge()?.openBackupDirectory?.(dir) ?? false
  }

  return {
    getSettings,
    saveSettings,
    runBackup,
    startScheduler,
    stopScheduler,
    restartScheduler,
    selectDirectory,
    useDefaultDirectory,
    ensureBackupDirectory,
    openBackupDirectory,
    backupRunning: readonly(backupRunning),
    isBrowserMode: () => !isUtoolsEnvironment() && supportsBrowserAutoBackup(),
    isUtoolsMode: () => hasUtoolsAutoBackupBridge(),
    getCapabilities: () => getUtoolsAutoBackupCapabilities(),
  }
}

import type { AutoBackupSettings } from '../types'
import { readonly, ref } from 'vue'
import { useStorage } from './useStorage'
import { useNoteStore } from '../stores/note'
import {
  formatAutoBackupFilename,
  isAutoBackupDue,
  normalizeAutoBackupSettings,
} from '../utils/autoBackup'
import { showAppNotification } from '../utils/notify'

const CHECK_INTERVAL_MS = 5 * 60 * 1000

let checkTimer: ReturnType<typeof setInterval> | null = null
const backupRunning = ref(false)

/** 自动备份是否可用（需 uTools 桥接层） */
export function isAutoBackupAvailable(): boolean {
  if (typeof window === 'undefined') return false
  const bridge = window.markflow
  return (
    !!bridge &&
    typeof bridge.selectBackupDirectory === 'function' &&
    typeof bridge.writeBackupFileSilent === 'function' &&
    typeof bridge.cleanOldBackupFiles === 'function'
  )
}

function getBridge() {
  return typeof window !== 'undefined' ? window.markflow : undefined
}

export function useAutoBackup() {
  const storage = useStorage()
  const store = useNoteStore()

  function getSettings(): AutoBackupSettings {
    return normalizeAutoBackupSettings(storage.getSettings().autoBackup)
  }

  function saveSettings(partial: Partial<AutoBackupSettings>): AutoBackupSettings {
    const current = storage.getSettings()
    const next = normalizeAutoBackupSettings({ ...current.autoBackup, ...partial })
    storage.saveSettings({ ...current, autoBackup: next })
    return next
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
      showAppNotification('自动备份仅在 uTools 中可用')
      return false
    }
    if (!cfg.directoryPath) {
      showAppNotification('请先选择自动备份目录')
      return false
    }
    if (!options?.force && !isAutoBackupDue(cfg.lastBackupAt, cfg.intervalHours)) {
      return false
    }

    const bridge = getBridge()
    if (!bridge) return false

    backupRunning.value = true
    saveSettings({ lastBackupStatus: 'running', lastBackupError: undefined })

    try {
      const backup = await store.exportLibraryBackup()
      const json = JSON.stringify(backup, null, 2)
      const filename = formatAutoBackupFilename(backup.exportedAt)
      const writeResult = bridge.writeBackupFileSilent(cfg.directoryPath, filename, json)
      if (!writeResult.ok) {
        throw new Error('写入备份文件失败')
      }

      const cleanResult = bridge.cleanOldBackupFiles(cfg.directoryPath, cfg.maxCopies)
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
    if (!cfg.enabled || !cfg.directoryPath) return
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

  function selectDirectory(): string | null {
    const bridge = getBridge()
    if (!bridge?.selectBackupDirectory) return null
    return bridge.selectBackupDirectory()
  }

  return {
    getSettings,
    saveSettings,
    runBackup,
    startScheduler,
    stopScheduler,
    restartScheduler,
    selectDirectory,
    backupRunning: readonly(backupRunning),
  }
}

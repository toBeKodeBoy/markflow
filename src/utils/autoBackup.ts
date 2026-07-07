import type { AutoBackupSettings } from '../types'

export const AUTO_BACKUP_FILE_PREFIX = 'markflow-backup-'
/** 仅匹配自动备份文件名（含 ISO 紧凑时间戳），不含手动导出的 YYYY-MM-DD 格式 */
export const AUTO_BACKUP_FILE_PATTERN = /^markflow-backup-\d{8}T\d{6}\.json$/

export const AUTO_BACKUP_INTERVAL_OPTIONS = [
  { value: 6 as const, label: '每 6 小时' },
  { value: 12 as const, label: '每 12 小时' },
  { value: 24 as const, label: '每 24 小时' },
  { value: 168 as const, label: '每 7 天' },
]

export const AUTO_BACKUP_MAX_COPIES_OPTIONS = [
  { value: 5, label: '最近 5 份' },
  { value: 10, label: '最近 10 份' },
  { value: 20, label: '最近 20 份' },
  { value: 0, label: '不限制' },
]

export const DEFAULT_AUTO_BACKUP_SETTINGS: AutoBackupSettings = {
  enabled: false,
  intervalHours: 24,
  maxCopies: 10,
}

/** 规范化自动备份设置（缺省字段补默认值） */
export function normalizeAutoBackupSettings(
  settings?: Partial<AutoBackupSettings> | null
): AutoBackupSettings {
  const intervalHours = settings?.intervalHours ?? DEFAULT_AUTO_BACKUP_SETTINGS.intervalHours
  const validInterval = AUTO_BACKUP_INTERVAL_OPTIONS.some((item) => item.value === intervalHours)
    ? intervalHours
    : DEFAULT_AUTO_BACKUP_SETTINGS.intervalHours

  const maxCopies = settings?.maxCopies ?? DEFAULT_AUTO_BACKUP_SETTINGS.maxCopies
  const validMaxCopies = AUTO_BACKUP_MAX_COPIES_OPTIONS.some((item) => item.value === maxCopies)
    ? maxCopies
    : DEFAULT_AUTO_BACKUP_SETTINGS.maxCopies

  return {
    enabled: settings?.enabled ?? false,
    intervalHours: validInterval,
    directoryPath: settings?.directoryPath,
    maxCopies: validMaxCopies,
    lastBackupAt: settings?.lastBackupAt,
    lastBackupStatus: settings?.lastBackupStatus,
    lastBackupPath: settings?.lastBackupPath,
    lastBackupError: settings?.lastBackupError,
  }
}

/** 生成带时间戳的备份文件名 */
export function formatAutoBackupFilename(exportedAt = Date.now()): string {
  const stamp = new Date(exportedAt)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
  return `${AUTO_BACKUP_FILE_PREFIX}${stamp}.json`
}

/** 判断是否到达自动备份间隔 */
export function isAutoBackupDue(
  lastBackupAt: number | undefined,
  intervalHours: number,
  now = Date.now()
): boolean {
  if (!lastBackupAt) return true
  return now - lastBackupAt >= intervalHours * 3600_000
}

/** 按文件名排序后，返回应删除的旧备份文件名（保留最新 maxCopies 份） */
export function pickBackupFilesToDelete(filenames: string[], maxCopies: number): string[] {
  if (maxCopies <= 0) return []
  const backupFiles = filenames.filter((name) => AUTO_BACKUP_FILE_PATTERN.test(name))
  if (backupFiles.length <= maxCopies) return []
  const sorted = [...backupFiles].sort((a, b) => b.localeCompare(a))
  return sorted.slice(maxCopies)
}

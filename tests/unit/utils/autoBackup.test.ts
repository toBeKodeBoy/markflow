import { describe, it, expect } from 'vitest'
import {
  AUTO_BACKUP_INTERVAL_OPTIONS,
  DEFAULT_AUTO_BACKUP_SETTINGS,
  formatAutoBackupFilename,
  isAutoBackupDue,
  isValidUtoolsBackupDirectory,
  normalizeAutoBackupSettings,
  pickBackupFilesToDelete,
} from '../../../src/utils/autoBackup'

describe('autoBackup utils', () => {
  it('normalizes missing auto backup settings', () => {
    expect(normalizeAutoBackupSettings()).toEqual(DEFAULT_AUTO_BACKUP_SETTINGS)
  })

  it('falls back to defaults for invalid values', () => {
    expect(
      normalizeAutoBackupSettings({
        enabled: true,
        intervalHours: 999 as never,
        maxCopies: 99,
      })
    ).toEqual({
      ...DEFAULT_AUTO_BACKUP_SETTINGS,
      enabled: true,
    })
  })

  it('formats backup filename with timestamp', () => {
    expect(formatAutoBackupFilename(Date.parse('2026-07-07T14:30:52.000Z'))).toBe(
      'markflow-backup-20260707T143052.json'
    )
  })

  it('detects due backup when never backed up', () => {
    expect(isAutoBackupDue(undefined, 24)).toBe(true)
  })

  it('detects due backup after interval elapsed', () => {
    const now = Date.parse('2026-07-08T15:00:00.000Z')
    const last = Date.parse('2026-07-07T14:00:00.000Z')
    expect(isAutoBackupDue(last, 24, now)).toBe(true)
  })

  it('skips backup before interval elapsed', () => {
    const now = Date.parse('2026-07-07T20:00:00.000Z')
    const last = Date.parse('2026-07-07T14:00:00.000Z')
    expect(isAutoBackupDue(last, 24, now)).toBe(false)
  })

  it('keeps latest backup files and deletes older ones', () => {
    const files = [
      'markflow-backup-20260707T120000.json',
      'markflow-backup-20260707T100000.json',
      'markflow-backup-20260707T080000.json',
      'other.json',
    ]
    expect(pickBackupFilesToDelete(files, 2)).toEqual(['markflow-backup-20260707T080000.json'])
  })

  it('does not delete manual export filenames', () => {
    const files = [
      'markflow-backup-20260707T120000.json',
      'markflow-backup-20260707T100000.json',
      'markflow-backup-2026-07-07.json',
    ]
    expect(pickBackupFilesToDelete(files, 1)).toEqual(['markflow-backup-20260707T100000.json'])
  })

  it('does not delete when max copies is unlimited', () => {
    expect(pickBackupFilesToDelete(['markflow-backup-20260707T120000.json'], 0)).toEqual([])
  })

  it('exposes 24h as default interval option', () => {
    expect(AUTO_BACKUP_INTERVAL_OPTIONS.some((item) => item.value === 24)).toBe(true)
  })

  it('validates uTools absolute backup directory', () => {
    expect(isValidUtoolsBackupDirectory('D:\\Backup\\MarkFlow')).toBe(true)
    expect(isValidUtoolsBackupDirectory('downloads')).toBe(false)
    expect(isValidUtoolsBackupDirectory('/var/backups')).toBe(true)
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { isAutoBackupAvailable, useAutoBackup, isUtoolsEnvironment, hasUtoolsAutoBackupBridge } from '../../../src/composables/useAutoBackup'

describe('useAutoBackup', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.stubGlobal('markflow', {
      getNoteList: () => [],
      saveNoteList: vi.fn(),
      getNote: () => null,
      saveNote: vi.fn(),
      removeNote: vi.fn(),
      getFolderList: () => [],
      saveFolderList: vi.fn(),
      getSettings: () =>
        JSON.parse(localStorage.getItem('markflow_settings') || 'null') || {
          theme: 'system',
          fontSize: 14,
          editorFontFamily: 'monospace',
          previewVisible: true,
          sidebarVisible: true,
        },
      saveSettings: (settings: unknown) => {
        localStorage.setItem('markflow_settings', JSON.stringify(settings))
      },
      showNotification: vi.fn(),
      selectBackupDirectory: vi.fn(() => 'D:\\Backup\\MarkFlow'),
      getDefaultBackupDirectory: vi.fn(() => 'C:\\Users\\Tester\\AppData\\Roaming\\markflow-backups'),
      getAutoBackupCapabilities: vi.fn(() => ({ version: 1, available: true, isDev: false })),
      openBackupDirectory: vi.fn(() => true),
      writeBackupFileSilent: vi.fn(() => ({ ok: true, path: 'D:\\Backup\\MarkFlow\\markflow-backup.json' })),
      cleanOldBackupFiles: vi.fn(() => ({ ok: true, deleted: 0 })),
      getAssetIndex: () => [],
      getAsset: () => null,
      saveAssetIndex: vi.fn(),
      saveAsset: vi.fn(),
      removeAsset: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    useAutoBackup().stopScheduler()
  })

  it('detects auto backup availability in uTools bridge', () => {
    expect(isAutoBackupAvailable()).toBe(true)
  })

  it('runs forced backup and updates settings', async () => {
    const autoBackup = useAutoBackup()
    autoBackup.saveSettings({
      enabled: true,
      intervalHours: 24,
      maxCopies: 10,
      directoryPath: 'D:\\Backup\\MarkFlow',
    })

    const ok = await autoBackup.runBackup({ force: true })
    expect(ok).toBe(true)

    const saved = autoBackup.getSettings()
    expect(saved.lastBackupStatus).toBe('success')
    expect(saved.lastBackupPath).toContain('markflow-backup')
    expect(window.markflow.writeBackupFileSilent).toHaveBeenCalled()
    expect(window.markflow.cleanOldBackupFiles).toHaveBeenCalledWith('D:\\Backup\\MarkFlow', 10)
  })

  it('marks backup success when cleanup fails but write succeeds', async () => {
    window.markflow.cleanOldBackupFiles = vi.fn(() => ({ ok: false, reason: 'error' }))
    const autoBackup = useAutoBackup()
    autoBackup.saveSettings({
      enabled: true,
      intervalHours: 24,
      maxCopies: 10,
      directoryPath: 'D:\\Backup\\MarkFlow',
    })

    const ok = await autoBackup.runBackup({ force: true })
    expect(ok).toBe(true)

    const saved = autoBackup.getSettings()
    expect(saved.lastBackupStatus).toBe('success')
    expect(saved.lastBackupAt).toBeTypeOf('number')
    expect(saved.lastBackupError).toBe('清理旧备份失败')
  })

  it('does not use browser fallback when uTools bridge exists without backup APIs', () => {
    vi.stubGlobal('showDirectoryPicker', vi.fn())
    vi.stubGlobal('markflow', {
      getSettings: () => ({}),
      saveSettings: vi.fn(),
    })
    expect(isUtoolsEnvironment()).toBe(true)
    expect(hasUtoolsAutoBackupBridge()).toBe(false)
    expect(isAutoBackupAvailable()).toBe(false)
  })

  it('rejects invalid uTools directory path saved from browser mode', async () => {
    const autoBackup = useAutoBackup()
    autoBackup.saveSettings({
      enabled: true,
      intervalHours: 24,
      maxCopies: 10,
      directoryPath: 'downloads',
    })

    expect(autoBackup.getSettings().directoryPath).toBeUndefined()

    const ok = await autoBackup.runBackup({ force: true })
    expect(ok).toBe(true)
    expect(window.markflow.getDefaultBackupDirectory).toHaveBeenCalled()
    expect(window.markflow.writeBackupFileSilent).toHaveBeenCalled()
  })

  it('uses default uTools directory when enabled without custom path', async () => {
    const autoBackup = useAutoBackup()
    const dir = await autoBackup.ensureBackupDirectory({ prompt: false })
    expect(dir).toBe('C:\\Users\\Tester\\AppData\\Roaming\\markflow-backups')
  })
})

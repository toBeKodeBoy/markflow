import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exportBackupToFile, importBackupFromFile } from '../../../src/composables/useBackup'

describe('useBackup', () => {
  beforeEach(() => {
    // @ts-expect-error cleanup
    delete window.markflow
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // @ts-expect-error cleanup
    delete window.markflow
  })

  it('uses markflow bridge when available', () => {
    const saveBackupFile = vi.fn(() => ({ ok: true as const, path: '/tmp/backup.json' }))
    window.markflow = { saveBackupFile } as unknown as typeof window.markflow

    const result = exportBackupToFile('{}', 'backup.json')
    expect(result).toEqual({ ok: true, path: '/tmp/backup.json' })
    expect(saveBackupFile).toHaveBeenCalledWith('{}', 'backup.json')
  })

  it('falls back to download in browser', () => {
    const anchor = { click: vi.fn(), href: '', download: '' } as unknown as HTMLAnchorElement
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const result = exportBackupToFile('{"v":1}', 'backup.json')
    expect(result.ok).toBe(true)
    expect(anchor.click).toHaveBeenCalled()
  })

  it('reads backup via bridge openBackupFile', () => {
    const openBackupFile = vi.fn(() => '{"notes":[]}')
    window.markflow = { openBackupFile } as unknown as typeof window.markflow

    expect(importBackupFromFile()).toEqual({ ok: true, content: '{"notes":[]}' })
  })

  it('returns cancel when bridge openBackupFile returns null', () => {
    const openBackupFile = vi.fn(() => null)
    window.markflow = { openBackupFile } as unknown as typeof window.markflow

    expect(importBackupFromFile()).toEqual({ ok: false, reason: 'cancel' })
  })

  it('returns fallback when no bridge', () => {
    expect(importBackupFromFile()).toEqual({ ok: false, reason: 'fallback' })
  })
})

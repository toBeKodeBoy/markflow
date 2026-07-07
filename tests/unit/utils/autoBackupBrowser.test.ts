import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { supportsBrowserAutoBackup, resetBrowserBackupDirectoryCache } from '../../../src/utils/autoBackupBrowser'
import { isAutoBackupAvailable } from '../../../src/composables/useAutoBackup'

describe('autoBackupBrowser', () => {
  beforeEach(() => {
    vi.stubGlobal('markflow', undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    resetBrowserBackupDirectoryCache()
  })

  it('detects File System Access API support', () => {
    vi.stubGlobal('showDirectoryPicker', vi.fn())
    expect(supportsBrowserAutoBackup()).toBe(true)
  })

  it('enables auto backup in browser when directory picker exists', () => {
    vi.stubGlobal('showDirectoryPicker', vi.fn())
    expect(isAutoBackupAvailable()).toBe(true)
  })

  it('does not treat uTools webview as browser auto backup host', () => {
    vi.stubGlobal('showDirectoryPicker', vi.fn())
    vi.stubGlobal('markflow', {})
    expect(isAutoBackupAvailable()).toBe(false)
  })
})

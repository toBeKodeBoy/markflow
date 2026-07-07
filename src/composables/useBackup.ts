export type BackupExportResult =
  | { ok: true; path?: string }
  | { ok: false; reason: 'cancel' | 'error' }

export function exportBackupToFile(json: string, filename: string): BackupExportResult {
  const bridge = typeof window !== 'undefined' ? window.markflow : undefined
  if (bridge && typeof bridge.saveBackupFile === 'function') {
    return bridge.saveBackupFile(json, filename)
  }

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
  return { ok: true }
}

export type BackupImportResult =
  | { ok: true; content: string }
  | { ok: false; reason: 'cancel' | 'fallback' }

export function importBackupFromFile(): BackupImportResult {
  const bridge = typeof window !== 'undefined' ? window.markflow : undefined
  if (bridge && typeof bridge.openBackupFile === 'function') {
    const content = bridge.openBackupFile()
    if (content === null) return { ok: false, reason: 'cancel' }
    return { ok: true, content }
  }
  return { ok: false, reason: 'fallback' }
}

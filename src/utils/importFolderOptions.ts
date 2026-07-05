import type { PersistedImportFolderOptions } from '../types/import'
import {
  DEFAULT_PERSISTED_IMPORT_OPTIONS,
  IMPORT_FOLDER_OPTIONS_KEY,
} from '../types/import'

/** Load persisted import folder options from storage */
export function loadImportFolderOptions(): PersistedImportFolderOptions {
  try {
    const raw = localStorage.getItem(IMPORT_FOLDER_OPTIONS_KEY)
    if (!raw) return { ...DEFAULT_PERSISTED_IMPORT_OPTIONS }
    const parsed = JSON.parse(raw) as Partial<PersistedImportFolderOptions>
    return {
      preserveStructure: parsed.preserveStructure ?? DEFAULT_PERSISTED_IMPORT_OPTIONS.preserveStructure,
      onConflict: parsed.onConflict ?? DEFAULT_PERSISTED_IMPORT_OPTIONS.onConflict,
      importImages: parsed.importImages ?? DEFAULT_PERSISTED_IMPORT_OPTIONS.importImages,
      replaceExisting: parsed.replaceExisting ?? DEFAULT_PERSISTED_IMPORT_OPTIONS.replaceExisting,
    }
  } catch {
    return { ...DEFAULT_PERSISTED_IMPORT_OPTIONS }
  }
}

/** Persist import folder options */
export function saveImportFolderOptions(options: PersistedImportFolderOptions): void {
  localStorage.setItem(IMPORT_FOLDER_OPTIONS_KEY, JSON.stringify(options))
}

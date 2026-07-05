import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadImportFolderOptions,
  saveImportFolderOptions,
} from '../src/utils/importFolderOptions'
import { IMPORT_FOLDER_OPTIONS_KEY } from '../src/types/import'

describe('importFolderOptions — Phase 3', () => {
  beforeEach(() => {
    localStorage.removeItem(IMPORT_FOLDER_OPTIONS_KEY)
  })

  it('returns defaults when nothing persisted', () => {
    expect(loadImportFolderOptions()).toEqual({
      preserveStructure: true,
      onConflict: 'rename',
      importImages: true,
      replaceExisting: false,
    })
  })

  it('persists and reloads options', () => {
    saveImportFolderOptions({
      preserveStructure: false,
      onConflict: 'skip',
      importImages: false,
    })
    expect(loadImportFolderOptions()).toEqual({
      preserveStructure: false,
      onConflict: 'skip',
      importImages: false,
      replaceExisting: false,
    })
  })
})

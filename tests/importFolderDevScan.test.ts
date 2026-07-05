import { describe, it, expect } from 'vitest'
import { normalizeDevRelativePath } from '../src/utils/importFolderDevScan'

describe('importFolderDevScan — Phase 3', () => {
  it('strips top-level folder from webkitRelativePath', () => {
    expect(normalizeDevRelativePath('myproject/readme.md')).toBe('readme.md')
    expect(normalizeDevRelativePath('myproject/docs/api.md')).toBe('docs/api.md')
  })
})

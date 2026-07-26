import { describe, expect, it } from 'vitest'
import { resolveImageExportTarget } from '../../../src/utils/imageExportPath'

describe('resolveImageExportTarget', () => {
  it('resolves same-folder mode to markdown directory with relative references', () => {
    const target = resolveImageExportTarget({
      markdownFilePath: 'D:\\docs\\note.md',
      noteTitle: 'note',
      mode: 'same-folder',
    })

    expect(target.assetDirAbsPath).toBe('D:\\docs')
    expect(target.markdownPathStyle).toBe('relative')
  })

  it('resolves note-assets-folder mode based on markdown filename', () => {
    const target = resolveImageExportTarget({
      markdownFilePath: 'D:\\docs\\meeting notes.md',
      noteTitle: 'meeting notes',
      mode: 'note-assets-folder',
    })

    expect(target.assetDirAbsPath).toBe('D:\\docs\\meeting notes.assets')
    expect(target.markdownPathStyle).toBe('relative')
  })

  it('resolves typora mode to absolute typora cache directory', () => {
    const target = resolveImageExportTarget({
      markdownFilePath: 'D:\\docs\\note.md',
      noteTitle: 'note',
      mode: 'typora-cache-absolute',
      typoraRootDir: 'C:\\Users\\Tester\\AppData\\Roaming\\Typora',
    })

    expect(target.assetDirAbsPath).toBe(
      'C:\\Users\\Tester\\AppData\\Roaming\\Typora\\typora-user-images'
    )
    expect(target.markdownPathStyle).toBe('absolute')
  })

  it('resolves custom relative template against markdown directory', () => {
    const target = resolveImageExportTarget({
      markdownFilePath: 'D:\\docs\\note.md',
      noteTitle: 'note',
      mode: 'custom-template',
      customTemplate: './assets/${filename}',
    })

    expect(target.assetDirAbsPath).toBe('D:\\docs\\assets\\note')
    expect(target.markdownPathStyle).toBe('relative')
  })
})

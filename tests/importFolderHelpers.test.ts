import { describe, it, expect } from 'vitest'
import {
  getRelativeDir,
  getFilenameStem,
  extractImportTitle,
  findRootFolderByName,
  parseFolderSequence,
  compareImportFolderNames,
  resolveUniqueTitle,
  isBlankContent,
  shouldSkipDirName,
  isImportableTextFilename,
  isImportableImageFilename,
  isImportableFilename,
  formatImportTextContent,
  normalizeRelativePath,
  hasRelativeImageReferences,
} from '../src/utils/importFolderHelpers'
import type { Folder } from '../src/types'

describe('importFolderHelpers', () => {
  describe('getRelativeDir', () => {
    it('returns undefined for root-level files', () => {
      expect(getRelativeDir('readme.md')).toBeUndefined()
    })

    it('returns parent path for nested files', () => {
      expect(getRelativeDir('docs/api.md')).toBe('docs')
      expect(getRelativeDir('docs/guide/setup.md')).toBe('docs/guide')
    })
  })

  describe('getFilenameStem', () => {
    it('strips extension from path', () => {
      expect(getFilenameStem('docs/api.md')).toBe('api')
      expect(getFilenameStem('readme.txt')).toBe('readme')
    })
  })

  describe('extractImportTitle', () => {
    it('prefers filename stem over heading', () => {
      expect(extractImportTitle('# Hello\n\nbody', 'readme.md')).toBe('readme')
      expect(extractImportTitle('# API\n\ndetails', 'docs/api.md')).toBe('api')
    })

    it('falls back to content when filename has no stem', () => {
      expect(extractImportTitle('# Hello\n\nbody', '.md')).toBe('Hello')
    })
  })

  describe('findRootFolderByName', () => {
    it('matches root folder only', () => {
      const folders: Folder[] = [
        { id: 'a', name: 'docs', order: 0 },
        { id: 'b', name: 'docs', order: 0, parentId: 'a' },
      ]
      expect(findRootFolderByName(folders, 'docs')?.id).toBe('a')
    })
  })

  describe('folder sequence helpers', () => {
    it('parses leading integer prefix from folder names', () => {
      expect(parseFolderSequence('01-介绍')).toEqual({
        hasSequence: true,
        sequence: 1,
        restName: '介绍',
      })
      expect(parseFolderSequence('2.安装')).toEqual({
        hasSequence: true,
        sequence: 2,
        restName: '安装',
      })
      expect(parseFolderSequence('10 API')).toEqual({
        hasSequence: true,
        sequence: 10,
        restName: 'API',
      })
      expect(parseFolderSequence('附录')).toEqual({
        hasSequence: false,
        sequence: Number.POSITIVE_INFINITY,
        restName: '附录',
      })
    })

    it('sorts sequenced folders before non-sequenced ones', () => {
      const names = ['附录', '10 API', '02-进阶', '01-基础']
      expect(names.sort(compareImportFolderNames)).toEqual(['01-基础', '02-进阶', '10 API', '附录'])
    })
  })

  describe('resolveUniqueTitle', () => {
    it('returns same title when no conflict', () => {
      const existing = new Set(['Other'])
      expect(resolveUniqueTitle('New', existing, 'rename')).toBe('New')
    })

    it('renames with numeric suffix on conflict', () => {
      const existing = new Set(['Doc', 'Doc (2)'])
      expect(resolveUniqueTitle('Doc', existing, 'rename')).toBe('Doc (3)')
    })

    it('returns null when skip and conflict', () => {
      const existing = new Set(['Doc'])
      expect(resolveUniqueTitle('Doc', existing, 'skip')).toBeNull()
    })
  })

  describe('isBlankContent', () => {
    it('detects whitespace-only content', () => {
      expect(isBlankContent('   \n  ')).toBe(true)
      expect(isBlankContent('# Title\n\ncontent')).toBe(false)
    })
  })

  describe('shouldSkipDirName', () => {
    it('skips common non-content directories', () => {
      expect(shouldSkipDirName('.git')).toBe(true)
      expect(shouldSkipDirName('node_modules')).toBe(true)
      expect(shouldSkipDirName('docs')).toBe(false)
    })
  })

  describe('isImportableFilename', () => {
    it('accepts markdown, text and code files', () => {
      expect(isImportableTextFilename('a.md')).toBe(true)
      expect(isImportableTextFilename('a.MD')).toBe(true)
      expect(isImportableTextFilename('a.txt')).toBe(true)
      expect(isImportableTextFilename('config.json')).toBe(true)
      expect(isImportableTextFilename('main.py')).toBe(true)
      expect(isImportableTextFilename('Dockerfile')).toBe(true)
    })

    it('accepts common image files', () => {
      expect(isImportableImageFilename('photo.png')).toBe(true)
      expect(isImportableImageFilename('icon.svg')).toBe(true)
      expect(isImportableFilename('photo.png')).toBe(true)
    })

    it('skips binary archives', () => {
      expect(isImportableFilename('app.exe')).toBe(false)
      expect(isImportableFilename('archive.zip')).toBe(false)
    })
  })

  describe('formatImportTextContent', () => {
    it('wraps json in fenced code block', () => {
      const out = formatImportTextContent('{"a":1}', 'data/config.json')
      expect(out).toContain('# config')
      expect(out).toContain('```json')
      expect(out).toContain('{"a":1}')
    })

    it('keeps markdown content unchanged', () => {
      const md = '# Title\n\nbody'
      expect(formatImportTextContent(md, 'readme.md')).toBe(md)
    })
  })

  describe('normalizeRelativePath', () => {
    it('uses forward slashes', () => {
      expect(normalizeRelativePath('docs\\api.md')).toBe('docs/api.md')
    })
  })

  describe('hasRelativeImageReferences', () => {
    it('detects local relative markdown images', () => {
      expect(hasRelativeImageReferences('![alt](assets/image.png)')).toBe(true)
      expect(hasRelativeImageReferences('![alt](./assets/image.png "title")')).toBe(true)
    })

    it('ignores remote and asset-backed images', () => {
      expect(hasRelativeImageReferences('![alt](https://example.com/a.png)')).toBe(false)
      expect(hasRelativeImageReferences('![alt](markflow-asset://a1)')).toBe(false)
      expect(hasRelativeImageReferences('plain text')).toBe(false)
    })
  })
})

describe('ensureFolderForPath', () => {
  it('reuses existing folder by name', async () => {
    const { ensureFolderForPath } = await import('../src/utils/importFolderHelpers')
    const folders: Folder[] = [{ id: 'f1', name: 'docs', order: 0 }]
    const created: string[] = []

    const id = ensureFolderForPath('docs', folders, (name) => {
      created.push(name)
      return { id: 'new', name, order: folders.length }
    })

    expect(id).toBe('f1')
    expect(created).toHaveLength(0)
  })

  it('creates nested folders when missing', async () => {
    const { ensureFolderForPath } = await import('../src/utils/importFolderHelpers')
    const folders: Folder[] = []
    let n = 0

    const id = ensureFolderForPath('docs/guide', folders, (name, parentId) => ({
      id: `f-${++n}`,
      name,
      order: folders.length,
      parentId,
    }))

    expect(id).toBe('f-2')
    expect(folders).toHaveLength(2)
    expect(folders[0]).toMatchObject({ name: 'docs', parentId: undefined })
    expect(folders[1]).toMatchObject({ name: 'guide', parentId: 'f-1' })
  })
})

import { describe, it, expect } from 'vitest'
import {
  getRelativeDir,
  getFilenameStem,
  extractImportTitle,
  findRootFolderByName,
  parseFolderSequence,
  compareImportFolderNames,
  resolveUniqueTitle,
  folderTitleKey,
  getOrCreateTitleSet,
  isBlankContent,
  shouldSkipDirName,
  isImportableTextFilename,
  isImportableImageFilename,
  isImportableFilename,
  formatImportTextContent,
  mimeFromImageExtension,
  isMarkdownFilename,
  compareImportRelativePaths,
  normalizeRelativePath,
  hasRelativeImageReferences,
  rewriteRelativeImages,
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

    it('剥离标题中的内联 Markdown 语法', () => {
      expect(extractImportTitle('# **加粗** 内容', '.md')).toBe('加粗 内容')
    })

    it('无标题但有正文内容时返回正文前 30 字符', () => {
      // 覆盖 `if (chunk.trim()) return chunk.trim().slice(0, 30)` 分支
      expect(extractImportTitle('这是正文内容', '.md')).toBe('这是正文内容')
    })

    it('超长正文截断为 30 个字符', () => {
      // 覆盖 slice(0, 30) 截断路径
      expect(extractImportTitle('A'.repeat(40), '.md')).toBe('A'.repeat(30))
    })

    it('全空白且超过 50 行无标题时返回无标题', () => {
      // 覆盖 while 循环耗尽（line >= TITLE_SCAN_LINES）与 `return '无标题'` 分支
      expect(extractImportTitle('\n'.repeat(51), '.md')).toBe('无标题')
    })

    it('空内容直接走到底返回无标题（覆盖 end===-1 break）', () => {
      // 覆盖 `if (end === -1) break` 真分支
      expect(extractImportTitle('', '.md')).toBe('无标题')
    })

    it('标题文本仅空白时剥离为空回退原文（空串）', () => {
      // 覆盖 `stripInlineMarkdown(raw) || raw` 右侧回退分支
      expect(extractImportTitle('#   \n', '.md')).toBe('')
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

    it('纯数字文件夹名回退到完整 trimmed 文本', () => {
      // 覆盖 `restName: match[2].trim() || trimmed` 右侧回退分支
      expect(parseFolderSequence('10')).toEqual({
        hasSequence: true,
        sequence: 10,
        restName: '10',
      })
    })

    it('无序号文件夹排在有序号文件夹之后', () => {
      // 覆盖 `parsedA.hasSequence ? -1 : 1` 中返回 1 的分支
      expect(compareImportFolderNames('附录', '10 API')).toBe(1)
      expect(compareImportFolderNames('10 API', '附录')).toBe(-1)
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

  describe('folderTitleKey / getOrCreateTitleSet', () => {
    it('maps undefined folderId to __root__', () => {
      expect(folderTitleKey(undefined)).toBe('__root__')
      expect(folderTitleKey('f1')).toBe('f1')
    })

    it('reuses the same Set for a folder and creates missing ones', () => {
      const map = new Map<string, Set<string>>()
      const rootSet = getOrCreateTitleSet(map, undefined)
      rootSet.add('A')
      expect(getOrCreateTitleSet(map, undefined)).toBe(rootSet)
      expect(getOrCreateTitleSet(map, undefined).has('A')).toBe(true)

      const folderSet = getOrCreateTitleSet(map, 'f1')
      expect(folderSet).not.toBe(rootSet)
      folderSet.add('A')
      expect(rootSet.has('A')).toBe(true)
      expect(folderSet.has('A')).toBe(true)
      expect(map.size).toBe(2)
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

    it('无扩展名且非已知基名时不可导入', () => {
      // 覆盖 isImportableTextFilename 的 `if (!ext) return false` 分支
      expect(isImportableTextFilename('randomfile')).toBe(false)
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

    it('未知扩展名回退为纯标题+正文（不走代码围栏）', () => {
      // 覆盖 `if (lang)` 为假分支与 `return # ${stem}\n\n${content}` 路径
      const out = formatImportTextContent('hello', 'notes.unknownext')
      expect(out).toBe('# notes\n\nhello')
    })

    it('内容以换行结尾时围栏体去除末尾换行', () => {
      // 覆盖 `content.endsWith('\n') ? content.slice(0, -1) : content` 真分支
      const out = formatImportTextContent('{"a":1}\n', 'data/config.json')
      expect(out).toContain('```json\n{"a":1}\n```')
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

  describe('mimeFromImageExtension', () => {
    it('maps common image extensions to mime types', () => {
      expect(mimeFromImageExtension('photo.jpg')).toBe('image/jpeg')
      expect(mimeFromImageExtension('icon.svg')).toBe('image/svg+xml')
      expect(mimeFromImageExtension('fav.ico')).toBe('image/x-icon')
      expect(mimeFromImageExtension('pic.bmp')).toBe('image/bmp')
    })

    it('falls back to image/<ext> for other extensions', () => {
      expect(mimeFromImageExtension('shot.png')).toBe('image/png')
      expect(mimeFromImageExtension('noext')).toBe('image/')
    })
  })

  describe('isMarkdownFilename (deprecated alias)', () => {
    it('delegates to isImportableTextFilename', () => {
      expect(isMarkdownFilename('a.md')).toBe(true)
      expect(isMarkdownFilename('app.exe')).toBe(false)
    })
  })

  describe('compareImportRelativePaths', () => {
    it('根级文件排在嵌套文件之前（segment 为空时返回 ±1）', () => {
      // 覆盖 `if (segmentA == null) return -1` 与 `if (segmentB == null) return 1`
      expect(compareImportRelativePaths('file.md', 'docs/file.md')).toBe(-1)
      expect(compareImportRelativePaths('docs/file.md', 'file.md')).toBe(1)
    })

    it('同级文件按文件名排序', () => {
      expect(compareImportRelativePaths('a.md', 'b.md')).toBeLessThan(0)
    })
  })

  describe('rewriteRelativeImages', () => {
    it('将匹配的相对图片路径改写为 markflow-asset 引用（含 title）', () => {
      // 覆盖 `if (!assetId) return match` 假分支、titleMatch 真分支
      const out = rewriteRelativeImages('![alt](assets/img.png "标题")', new Map([['assets/img.png', 'a1']]))
      expect(out).toBe('![alt](markflow-asset://a1 "标题")')
    })

    it('无 title 时省略 title 后缀', () => {
      // 覆盖 titleMatch 假分支
      const out = rewriteRelativeImages('![alt](assets/img.png)', new Map([['assets/img.png', 'a1']]))
      expect(out).toBe('![alt](markflow-asset://a1)')
    })

    it('未匹配到 assetId 时保持原文不变', () => {
      // 覆盖 `if (!assetId) return match` 真分支
      const md = '![alt](assets/img.png)'
      expect(rewriteRelativeImages(md, new Map())).toBe(md)
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

  it('creates nested folders under provided parentId', async () => {
    const { ensureFolderForPath } = await import('../src/utils/importFolderHelpers')
    const folders: Folder[] = [{ id: 'root', name: 'project', order: 0 }]
    let n = 0

    const id = ensureFolderForPath('docs/guide', folders, (name, parentId) => ({
      id: `f-${++n}`,
      name,
      order: folders.length,
      parentId,
    }), 'root')

    expect(id).toBe('f-2')
    expect(folders[1]).toMatchObject({ name: 'docs', parentId: 'root' })
    expect(folders[2]).toMatchObject({ name: 'guide', parentId: 'f-1' })
  })

  it('throws on empty dirPath', async () => {
    // 覆盖 `if (segments.length === 0) throw` 分支
    const { ensureFolderForPath } = await import('../src/utils/importFolderHelpers')
    expect(() =>
      ensureFolderForPath('', [], () => ({ id: 'x', name: '', order: 0 }))
    ).toThrow()
    // 仅分隔符的路径同样过滤为空段
    expect(() =>
      ensureFolderForPath('///', [], () => ({ id: 'x', name: '', order: 0 }))
    ).toThrow()
  })
})

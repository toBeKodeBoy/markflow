import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runFolderImport } from '../src/utils/importFolderService'
import type { ImportFolderScanResult, ImportFolderOptions } from '../src/types/import'
import type { Folder, Note } from '../src/types'

function makeScan(files: Array<{ path: string; content: string }>): ImportFolderScanResult {
  return {
    rootPath: '/tmp/project',
    files: files.map((f) => ({
      relativePath: f.path,
      content: f.content,
      images: [],
    })),
  }
}

describe('runFolderImport — Phase 1', () => {
  let folders: Folder[]
  let notes: Note[]
  let saveFolderList: ReturnType<typeof vi.fn>
  let saveNote: ReturnType<typeof vi.fn>
  let onProgress: ReturnType<typeof vi.fn>

  beforeEach(() => {
    folders = []
    notes = []
    saveFolderList = vi.fn((list: Folder[]) => {
      folders = [...list]
    })
    saveNote = vi.fn((note: Note) => {
      const idx = notes.findIndex((n) => n.id === note.id)
      if (idx >= 0) notes[idx] = note
      else notes.push(note)
    })
    onProgress = vi.fn()
  })

  const defaultOptions: ImportFolderOptions = {
    preserveStructure: true,
    onConflict: 'rename',
    importImages: false,
    replaceExisting: false,
    selectedPaths: null,
  }

  function run(scan: ImportFolderScanResult, options: Partial<ImportFolderOptions> = {}) {
    return runFolderImport(scan, { ...defaultOptions, ...options }, {
      getFolderList: () => folders,
      saveFolderList,
      saveNote,
      getExistingNotes: () => notes,
      getExistingTitles: () => new Set(notes.map((n) => n.title)),
      saveImageFromBase64: vi.fn(async () => 'asset-id'),
      onProgress,
    })
  }

  it('imports root and nested files with folder mapping', async () => {
    const result = await run(
      makeScan([
        { path: 'readme.md', content: '# Readme\n\nhello' },
        { path: 'docs/api.md', content: '# API\n\ndetails' },
      ])
    )

    expect(result.imported).toBe(2)
    expect(result.skipped).toBe(0)
    expect(result.foldersCreated).toBe(1)
    expect(folders.some((f) => f.name === 'docs')).toBe(true)
    expect(notes.find((n) => n.title === 'readme')?.folderId).toBeUndefined()
    expect(notes.find((n) => n.title === 'api')?.folderId).toBeTruthy()
    expect(notes.every((n) => n.importSourcePath)).toBe(true)
  })

  it('sorts folders by leading integer prefix and assigns note sortOrder in that order', async () => {
    const result = await run(
      makeScan([
        { path: '10-附录/z.md', content: '# Z' },
        { path: '02-进阶/b.md', content: '# B' },
        { path: '01-基础/c.md', content: '# C' },
        { path: '01-基础/a.md', content: '# A' },
      ])
    )

    expect(result.imported).toBe(4)
    expect(folders.map((f) => `${f.order}:${f.name}`)).toEqual(['0:01-基础', '1:02-进阶', '2:10-附录'])

    const baseFolderId = folders.find((f) => f.name === '01-基础')?.id
    expect(
      notes
        .filter((n) => n.folderId === baseFolderId)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((n) => `${n.sortOrder}:${n.title}`)
    ).toEqual(['100:a', '200:c'])
  })

  it('imports all files into target folder when preserveStructure is false', async () => {
    folders = [{ id: 'target', name: 'Imported', order: 0 }]

    const result = await run(
      makeScan([
        { path: 'readme.md', content: '# A' },
        { path: 'docs/b.md', content: '# B' },
      ]),
      { preserveStructure: false, targetFolderId: 'target' }
    )

    expect(result.imported).toBe(2)
    expect(result.foldersCreated).toBe(0)
    expect(notes.every((n) => n.folderId === 'target')).toBe(true)
  })

  it('appends imported notes after existing sibling sortOrder in non-empty folder', async () => {
    notes = [
      {
        id: 'existing-1',
        title: 'old-a',
        content: '',
        folderId: 'target',
        tags: [],
        sortOrder: 100,
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: 'existing-2',
        title: 'old-b',
        content: '',
        folderId: 'target',
        tags: [],
        sortOrder: 200,
        createdAt: 2,
        updatedAt: 2,
      },
    ]
    folders = [{ id: 'target', name: 'Imported', order: 0 }]

    const result = await run(
      makeScan([
        { path: 'a.md', content: '# A' },
        { path: 'b.md', content: '# B' },
      ]),
      { preserveStructure: false, targetFolderId: 'target' }
    )

    expect(result.imported).toBe(2)
    expect(notes.filter((n) => n.folderId === 'target').map((n) => `${n.title}:${n.sortOrder}`)).toEqual([
      'old-a:100',
      'old-b:200',
      'a:300',
      'b:400',
    ])
  })

  it('skips blank files', async () => {
    const result = await run(
      makeScan([
        { path: 'empty.md', content: '  \n  ' },
        { path: 'ok.md', content: '# OK' },
      ])
    )

    expect(result.imported).toBe(1)
    expect(result.skipped).toBe(1)
  })

  it('imports json files with code fence formatting', async () => {
    const result = await run(
      makeScan([{ path: 'config.json', content: '{"enabled":true}' }])
    )

    expect(result.imported).toBe(1)
    expect(notes[0].content).toContain('```json')
    expect(notes[0].content).toContain('{"enabled":true}')
  })

  it('imports standalone image files as notes when importImages is enabled', async () => {
    const scan: ImportFolderScanResult = {
      rootPath: '/tmp/project',
      files: [{
        relativePath: 'assets/logo.png',
        content: '',
        images: [],
        standaloneImage: { relPath: 'logo.png', base64: 'abc', mime: 'image/png' },
      }],
    }

    const result = await run(scan, { importImages: true })

    expect(result.imported).toBe(1)
    expect(notes[0].title).toBe('logo')
    expect(notes[0].content).toContain('markflow-asset://')
  })

  it('skips standalone image files when importImages is disabled', async () => {
    const scan: ImportFolderScanResult = {
      rootPath: '/tmp/project',
      files: [{
        relativePath: 'assets/logo.png',
        content: '',
        images: [],
        standaloneImage: { relPath: 'logo.png', base64: 'abc', mime: 'image/png' },
      }],
    }

    const result = await run(scan, { importImages: false })

    expect(result.imported).toBe(0)
    expect(result.skipped).toBe(1)
  })

  it('renames conflicting titles', async () => {
    notes = [{
      id: '1',
      title: 'doc',
      content: '',
      tags: [],
      createdAt: 1,
      updatedAt: 1,
    }]

    const result = await run(makeScan([{ path: 'doc.md', content: '# Doc Title\n\nnew' }]))

    expect(result.imported).toBe(1)
    expect(notes.some((n) => n.title === 'doc (2)')).toBe(true)
  })

  it('skips conflicting titles when onConflict is skip', async () => {
    notes = [{
      id: '1',
      title: 'doc',
      content: '',
      tags: [],
      createdAt: 1,
      updatedAt: 1,
    }]

    const result = await run(
      makeScan([{ path: 'doc.md', content: '# Doc\n\nnew' }]),
      { onConflict: 'skip' }
    )

    expect(result.imported).toBe(0)
    expect(result.skipped).toBe(1)
  })

  it('reports progress per file', async () => {
    await run(makeScan([
      { path: 'a.md', content: '# A' },
      { path: 'b.md', content: '# B' },
    ]))

    expect(onProgress).toHaveBeenCalled()
    expect(onProgress.mock.calls.at(-1)?.[0]).toMatchObject({ current: 2, total: 2 })
  })
})

describe('runFolderImport — Phase 2 images', () => {
  it('rewrites relative image paths to markflow-asset refs', async () => {
    const saveImage = vi.fn(async () => 'img-123')
    const folders: Folder[] = []
    const notes: Note[] = []

    const result = await runFolderImport(
      {
        rootPath: '/tmp',
        files: [{
          relativePath: 'post.md',
          content: '# Post\n\n![pic](./images/a.png)',
          images: [{ relPath: './images/a.png', base64: 'abc', mime: 'image/png' }],
        }],
      },
      {
        preserveStructure: true,
        onConflict: 'rename',
        importImages: true,
        selectedPaths: null,
      },
      {
        getFolderList: () => folders,
        saveFolderList: (list) => { folders.splice(0, folders.length, ...list) },
        saveNote: (note) => notes.push(note),
        getExistingTitles: () => new Set<string>(),
        saveImageFromBase64: saveImage,
      }
    )

    expect(result.imported).toBe(1)
    expect(saveImage).toHaveBeenCalledWith('abc', 'image/png', 'a.png')
    expect(notes[0].content).toContain('markflow-asset://img-123')
    expect(notes[0].content).not.toContain('./images/a.png')
  })

  it('records image import warnings when save fails', async () => {
    const result = await runFolderImport(
      {
        rootPath: '/tmp',
        files: [{
          relativePath: 'post.md',
          content: '![pic](./a.png)',
          images: [{ relPath: './a.png', base64: 'x', mime: 'image/png' }],
        }],
      },
      {
        preserveStructure: true,
        onConflict: 'rename',
        importImages: true,
        selectedPaths: null,
      },
      {
        getFolderList: () => [],
        saveFolderList: () => {},
        saveNote: () => {},
        getExistingTitles: () => new Set<string>(),
        saveImageFromBase64: vi.fn(async () => {
          throw new Error('quota')
        }),
      }
    )

    expect(result.imported).toBe(1)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('a.png')
  })
})

describe('runFolderImport — Phase 3 selection', () => {
  it('imports only selected paths when provided', async () => {
    const notes: Note[] = []

    const result = await runFolderImport(
      makeScan([
        { path: 'a.md', content: '# A' },
        { path: 'b.md', content: '# B' },
        { path: 'c.md', content: '# C' },
      ]),
      {
        preserveStructure: true,
        onConflict: 'rename',
        importImages: false,
        selectedPaths: new Set(['a.md', 'c.md']),
      },
      {
        getFolderList: () => [],
        saveFolderList: () => {},
        saveNote: (n) => notes.push(n),
        getExistingTitles: () => new Set<string>(),
        saveImageFromBase64: vi.fn(),
      }
    )

    expect(result.imported).toBe(2)
    expect(notes.map((n) => n.title).sort()).toEqual(['a', 'c'])
  })
})

describe('runFolderImport — atomic commit', () => {
  it('rolls back notes, folders and assets when commit fails', async () => {
    const folders: Folder[] = [{ id: 'f0', name: 'existing', order: 0 }]
    const folderSnapshot = [...folders]
    const savedNotes: Note[] = []
    const removedNoteIds: string[] = []
    const removedAssetIds: string[] = []
    let saveNoteCalls = 0

    await expect(
      runFolderImport(
        {
          rootPath: '/tmp',
          files: [
            {
              relativePath: 'docs/a.md',
              content: '# A\n\n![pic](./a.png)',
              images: [{ relPath: './a.png', base64: 'abc', mime: 'image/png' }],
            },
            {
              relativePath: 'docs/b.md',
              content: '# B',
              images: [],
            },
          ],
        },
        {
          preserveStructure: true,
          onConflict: 'rename',
          importImages: true,
          selectedPaths: null,
        },
        {
          getFolderList: () => folders,
          saveFolderList: (list) => {
            folders.splice(0, folders.length, ...list)
          },
          saveNote: () => {
            saveNoteCalls++
            if (saveNoteCalls === 2) throw new Error('disk full')
          },
          removeNote: (id) => {
            removedNoteIds.push(id)
          },
          removeAsset: (id) => {
            removedAssetIds.push(id)
          },
          getExistingTitles: () => new Set<string>(),
          saveImageFromBase64: vi.fn(async () => 'asset-1'),
        }
      )
    ).rejects.toThrow('已回滚')

    expect(folders).toEqual(folderSnapshot)
    expect(removedNoteIds).toHaveLength(2)
    expect(removedAssetIds.length).toBeGreaterThan(0)
    expect(savedNotes).toHaveLength(0)
  })
})

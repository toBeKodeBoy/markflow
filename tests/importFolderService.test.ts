import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runFolderImport } from '../src/utils/importFolderService'
import { folderTitleKey, getOrCreateTitleSet } from '../src/utils/importFolderHelpers'
import type { ImportFolderScanResult, ImportFolderOptions } from '../src/types/import'
import type { Folder, Note } from '../src/types'

function titlesByFolder(notes: Note[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const note of notes) {
    getOrCreateTitleSet(map, note.folderId).add(note.title)
  }
  return map
}

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
      getExistingTitlesByFolder: () => titlesByFolder(notes),
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
    expect(result.foldersCreated).toBe(2)
    const rootFolder = folders.find((f) => f.name === 'project')
    expect(rootFolder).toBeTruthy()
    expect(folders.some((f) => f.name === 'docs')).toBe(true)
    expect(notes.find((n) => n.title === 'readme')?.folderId).toBe(rootFolder?.id)
    expect(notes.find((n) => n.title === 'api')?.folderId).toBeTruthy()
    expect(notes.every((n) => n.importSourcePath)).toBe(true)
  })

  it('preserves selected root folder as top-level node when keeping structure', async () => {
    const result = await run(
      makeScan([
        { path: 'README.md', content: '# README' },
        { path: 'docs/guide/setup.md', content: '# Setup' },
      ])
    )

    expect(result.imported).toBe(2)
    expect(result.foldersCreated).toBe(3)

    const rootFolder = folders.find((f) => f.name === 'project')
    const docsFolder = folders.find((f) => f.name === 'docs')
    const guideFolder = folders.find((f) => f.name === 'guide')

    expect(rootFolder).toBeTruthy()
    expect(docsFolder?.parentId).toBe(rootFolder?.id)
    expect(guideFolder?.parentId).toBe(docsFolder?.id)
    expect(notes.find((n) => n.title === 'README')?.folderId).toBe(rootFolder?.id)
    expect(notes.find((n) => n.title === 'setup')?.folderId).toBe(guideFolder?.id)
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
    const rootFolder = folders.find((f) => f.name === 'project')
    expect(rootFolder?.order).toBe(0)
    expect(rootFolder?.parentId).toBeUndefined()
    expect(
      folders
        .filter((f) => f.parentId === rootFolder?.id)
        .map((f) => `${f.order}:${f.name}`)
    ).toEqual(['0:01-基础', '1:02-进阶', '2:10-附录'])

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
        sortOrder: 100,
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: 'existing-2',
        title: 'old-b',
        content: '',
        folderId: 'target',
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

  it('keeps same title across different folders', async () => {
    const result = await run(
      makeScan([
        { path: 'docs/README.md', content: '# Docs README' },
        { path: 'api/README.md', content: '# API README' },
      ])
    )

    expect(result.imported).toBe(2)
    const readmes = notes.filter((n) => n.title === 'README')
    expect(readmes).toHaveLength(2)
    expect(readmes[0].folderId).not.toBe(readmes[1].folderId)
  })

  it('renames conflicting titles within the same folder', async () => {
    folders = [{ id: 'f1', name: 'target', order: 0 }]
    notes = [{
      id: '1',
      title: 'doc',
      content: '',
      folderId: 'f1',
      createdAt: 1,
      updatedAt: 1,
    }]

    const result = await run(
      makeScan([{ path: 'doc.md', content: '# Doc Title\n\nnew' }]),
      { preserveStructure: false, targetFolderId: 'f1' }
    )

    expect(result.imported).toBe(1)
    expect(notes.some((n) => n.title === 'doc (2)' && n.folderId === 'f1')).toBe(true)
  })

  it('does not rename when existing same title is in another folder', async () => {
    notes = [{
      id: '1',
      title: 'doc',
      content: '',
      createdAt: 1,
      updatedAt: 1,
    }]

    const result = await run(makeScan([{ path: 'doc.md', content: '# Doc Title\n\nnew' }]))

    expect(result.imported).toBe(1)
    expect(notes.filter((n) => n.title === 'doc')).toHaveLength(2)
    expect(notes.some((n) => n.title === 'doc (2)')).toBe(false)
    expect(folderTitleKey(notes.find((n) => n.id !== '1')?.folderId)).not.toBe('__root__')
  })

  it('skips conflicting titles when onConflict is skip', async () => {
    folders = [{ id: 'f1', name: 'target', order: 0 }]
    notes = [{
      id: '1',
      title: 'doc',
      content: '',
      folderId: 'f1',
      createdAt: 1,
      updatedAt: 1,
    }]

    const result = await run(
      makeScan([{ path: 'doc.md', content: '# Doc\n\nnew' }]),
      { preserveStructure: false, targetFolderId: 'f1', onConflict: 'skip' }
    )

    expect(result.imported).toBe(0)
    expect(result.skipped).toBe(1)
  })

  it('renames batch duplicates in the same directory', async () => {
    const result = await run(
      makeScan([
        { path: 'docs/README.md', content: '# One' },
        { path: 'docs/README.md', content: '# Two' },
      ])
    )

    expect(result.imported).toBe(2)
    const docsFolder = folders.find((f) => f.name === 'docs')
    const titles = notes
      .filter((n) => n.folderId === docsFolder?.id)
      .map((n) => n.title)
      .sort()
    expect(titles).toEqual(['README', 'README (2)'])
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
        getExistingTitlesByFolder: () => new Map(),
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
        getExistingTitlesByFolder: () => new Map(),
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
    const folders: Folder[] = []

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
        getFolderList: () => folders,
        saveFolderList: (list) => {
          folders.splice(0, folders.length, ...list)
        },
        saveNote: (n) => notes.push(n),
        getExistingTitlesByFolder: () => new Map(),
        saveImageFromBase64: vi.fn(),
      }
    )

    expect(result.imported).toBe(2)
    expect(notes.map((n) => n.title).sort()).toEqual(['a', 'c'])
  })

  it('keeps root folder and required ancestors for partial selection', async () => {
    const notes: Note[] = []
    const folders: Folder[] = []

    const result = await runFolderImport(
      makeScan([
        { path: 'a.md', content: '# A' },
        { path: 'docs/b.md', content: '# B' },
        { path: 'docs/deep/c.md', content: '# C' },
      ]),
      {
        preserveStructure: true,
        onConflict: 'rename',
        importImages: false,
        replaceExisting: false,
        selectedPaths: new Set(['docs/deep/c.md']),
      },
      {
        getFolderList: () => folders,
        saveFolderList: (list) => {
          folders.splice(0, folders.length, ...list)
        },
        saveNote: (n) => notes.push(n),
        getExistingTitlesByFolder: () => new Map(),
        saveImageFromBase64: vi.fn(),
      }
    )

    expect(result.imported).toBe(1)
    expect(result.foldersCreated).toBe(3)

    const rootFolder = folders.find((f) => f.name === 'project')
    const docsFolder = folders.find((f) => f.name === 'docs')
    const deepFolder = folders.find((f) => f.name === 'deep')

    expect(rootFolder).toBeTruthy()
    expect(docsFolder?.parentId).toBe(rootFolder?.id)
    expect(deepFolder?.parentId).toBe(docsFolder?.id)
    expect(notes[0]?.title).toBe('c')
    expect(notes[0]?.folderId).toBe(deepFolder?.id)
  })
})

describe('runFolderImport — incremental commit', () => {
  it('flushes with saveNoteBatch and notifies onNotesCommitted', async () => {
    const folders: Folder[] = []
    const notes: Note[] = []
    const committedBatches: Note[][] = []
    const saveNoteBatch = vi.fn((batch: Note[]) => {
      notes.push(...batch)
    })
    const saveNote = vi.fn()

    const files = Array.from({ length: 5 }, (_, i) => ({
      path: `n${i}.md`,
      content: `# N${i}`,
    }))

    const result = await runFolderImport(
      makeScan(files),
      {
        preserveStructure: true,
        onConflict: 'rename',
        importImages: false,
        selectedPaths: null,
      },
      {
        getFolderList: () => folders,
        saveFolderList: (list) => {
          folders.splice(0, folders.length, ...list)
        },
        saveNote,
        saveNoteBatch,
        onNotesCommitted: (batch) => {
          committedBatches.push([...batch])
        },
        getExistingTitlesByFolder: () => new Map(),
        saveImageFromBase64: vi.fn(async () => 'asset-id'),
        commitBatchSize: 2,
        yieldInterval: 100,
      }
    )

    expect(result.imported).toBe(5)
    expect(saveNoteBatch).toHaveBeenCalledTimes(3) // 2+2+1
    expect(saveNote).not.toHaveBeenCalled()
    expect(committedBatches.map((b) => b.length)).toEqual([2, 2, 1])
    expect(notes).toHaveLength(5)
  })

  it('yields periodically during import', async () => {
    vi.useFakeTimers()
    const folders: Folder[] = []
    const notes: Note[] = []
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    const files = Array.from({ length: 5 }, (_, i) => ({
      path: `y${i}.md`,
      content: `# Y${i}`,
    }))

    const importPromise = runFolderImport(
      makeScan(files),
      {
        preserveStructure: false,
        onConflict: 'rename',
        importImages: false,
        selectedPaths: null,
      },
      {
        getFolderList: () => folders,
        saveFolderList: () => {},
        saveNote: (note) => notes.push(note),
        getExistingTitlesByFolder: () => new Map(),
        saveImageFromBase64: vi.fn(async () => 'asset-id'),
        commitBatchSize: 50,
        yieldInterval: 2,
      }
    )

    await vi.runAllTimersAsync()
    const result = await importPromise
    expect(result.imported).toBe(5)
    // i+1 为 2、4 时各 yield 一次
    expect(setTimeoutSpy.mock.calls.some((c) => c[1] === 0)).toBe(true)
    vi.useRealTimers()
  })

  it('keeps committed batches when a later flush fails', async () => {
    const folders: Folder[] = [{ id: 'f0', name: 'existing', order: 0 }]
    const savedNotes: Note[] = []
    const removedNoteIds: string[] = []
    let flushCount = 0

    await expect(
      runFolderImport(
        makeScan([
          { path: 'a.md', content: '# A' },
          { path: 'b.md', content: '# B' },
          { path: 'c.md', content: '# C' },
        ]),
        {
          preserveStructure: false,
          onConflict: 'rename',
          importImages: false,
          selectedPaths: null,
        },
        {
          getFolderList: () => folders,
          saveFolderList: (list) => {
            folders.splice(0, folders.length, ...list)
          },
          saveNote: () => {
            throw new Error('should use batch')
          },
          saveNoteBatch: (batch) => {
            flushCount++
            if (flushCount === 2) throw new Error('disk full')
            savedNotes.push(...batch)
          },
          removeNote: (id) => {
            removedNoteIds.push(id)
          },
          getExistingTitlesByFolder: () => new Map(),
          saveImageFromBase64: vi.fn(async () => 'asset-id'),
          commitBatchSize: 2,
          yieldInterval: 100,
        }
      )
    ).rejects.toThrow('已回滚当前批次')

    expect(savedNotes).toHaveLength(2)
    expect(removedNoteIds).toHaveLength(1) // 仅第三批失败回滚
    expect(folders.find((f) => f.id === 'f0')).toBeTruthy()
  })

  it('prunes folders created only for the failing batch', async () => {
    const folders: Folder[] = []
    let flushCount = 0

    await expect(
      runFolderImport(
        makeScan([
          { path: 'docs/a.md', content: '# A' },
          { path: 'other/b.md', content: '# B' },
        ]),
        {
          preserveStructure: true,
          onConflict: 'rename',
          importImages: false,
          selectedPaths: null,
        },
        {
          getFolderList: () => folders,
          saveFolderList: (list) => {
            folders.splice(0, folders.length, ...list)
          },
          saveNote: () => {
            throw new Error('should use batch')
          },
          saveNoteBatch: () => {
            flushCount++
            if (flushCount === 2) throw new Error('disk full')
          },
          removeNote: () => {},
          getExistingTitlesByFolder: () => new Map(),
          saveImageFromBase64: vi.fn(async () => 'asset-id'),
          commitBatchSize: 1,
          yieldInterval: 100,
        }
      )
    ).rejects.toThrow('已回滚当前批次')

    expect(folders.some((f) => f.name === 'docs')).toBe(true)
    expect(folders.some((f) => f.name === 'other')).toBe(false)
    expect(folders.some((f) => f.name === 'project')).toBe(true)
  })

  it('falls back to saveNote when saveNoteBatch is absent', async () => {
    const notes: Note[] = []
    const saveNote = vi.fn((note: Note) => notes.push(note))

    const result = await runFolderImport(
      makeScan([{ path: 'solo.md', content: '# Solo' }]),
      {
        preserveStructure: false,
        onConflict: 'rename',
        importImages: false,
        selectedPaths: null,
      },
      {
        getFolderList: () => [],
        saveFolderList: () => {},
        saveNote,
        getExistingTitlesByFolder: () => new Map(),
        saveImageFromBase64: vi.fn(async () => 'asset-id'),
      }
    )

    expect(result.imported).toBe(1)
    expect(saveNote).toHaveBeenCalledTimes(1)
  })

  it('imports 200 files with O(batches) saveNoteBatch calls', async () => {
    const notes: Note[] = []
    const saveNoteBatch = vi.fn((batch: Note[]) => {
      notes.push(...batch)
    })
    const files = Array.from({ length: 200 }, (_, i) => ({
      path: `f${String(i).padStart(3, '0')}.md`,
      content: `# File ${i}`,
    }))

    const result = await runFolderImport(
      makeScan(files),
      {
        preserveStructure: false,
        onConflict: 'rename',
        importImages: false,
        selectedPaths: null,
      },
      {
        getFolderList: () => [],
        saveFolderList: () => {},
        saveNote: vi.fn(),
        saveNoteBatch,
        getExistingTitlesByFolder: () => new Map(),
        saveImageFromBase64: vi.fn(async () => 'asset-id'),
        yieldInterval: 1000,
      }
    )

    expect(result.imported).toBe(200)
    expect(notes).toHaveLength(200)
    expect(saveNoteBatch).toHaveBeenCalledTimes(4) // 50*4
  })
})

describe('runFolderImport — batch rollback', () => {
  it('rolls back only the failing batch notes and assets', async () => {
    const folders: Folder[] = [{ id: 'f0', name: 'existing', order: 0 }]
    const folderSnapshot = [...folders]
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
          getExistingTitlesByFolder: () => new Map(),
          saveImageFromBase64: vi.fn(async () => 'asset-1'),
          commitBatchSize: 50,
        }
      )
    ).rejects.toThrow('已回滚当前批次')

    // 单批失败：回滚该批笔记与未提交资源；无已提交批次时可恢复文件夹快照
    expect(folders).toEqual(folderSnapshot)
    expect(removedNoteIds).toHaveLength(2)
    expect(removedAssetIds.length).toBeGreaterThan(0)
  })
})

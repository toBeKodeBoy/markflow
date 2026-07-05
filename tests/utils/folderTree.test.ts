import { describe, it, expect } from 'vitest'
import type { Folder } from '../../src/types'
import {
  flattenFolderTree,
  migrateLegacyPathFolders,
  collectDescendantFolderIds,
  getFolderPathLabel,
} from '../../src/utils/folderTree'
import { ensureFolderForPath } from '../../src/utils/importFolderHelpers'

function folder(id: string, name: string, parentId?: string, order = 0): Folder {
  return { id, name, order, parentId }
}

describe('folderTree', () => {
  it('flattenFolderTree respects expanded state', () => {
    const folders = [folder('a', 'docs'), folder('b', 'api', 'a')]
    const collapsed = flattenFolderTree(folders, new Set())
    expect(collapsed.map((r) => r.folder.id)).toEqual(['a'])

    const expanded = flattenFolderTree(folders, new Set(['a']))
    expect(expanded.map((r) => r.folder.id)).toEqual(['a', 'b'])
  })

  it('migrateLegacyPathFolders splits path names and keeps leaf id', () => {
    const legacy = [folder('leaf', 'docs/api', undefined, 1)]
    const { folders, changed } = migrateLegacyPathFolders(legacy)
    expect(changed).toBe(true)
    expect(folders).toHaveLength(2)
    expect(folders.find((f) => f.id === 'leaf')).toMatchObject({ name: 'api' })
    const docs = folders.find((f) => f.name === 'docs')
    expect(folders.find((f) => f.id === 'leaf')?.parentId).toBe(docs?.id)
  })

  it('collectDescendantFolderIds includes nested folders', () => {
    const folders = [folder('a', 'docs'), folder('b', 'api', 'a'), folder('c', 'v1', 'b')]
    const ids = collectDescendantFolderIds('a', folders)
    expect([...ids].sort()).toEqual(['a', 'b', 'c'])
  })

  it('getFolderPathLabel builds nested label', () => {
    const folders = [folder('a', 'docs'), folder('b', 'api', 'a')]
    expect(getFolderPathLabel(folders, 'b')).toBe('docs / api')
  })
})

describe('ensureFolderForPath (import)', () => {
  it('creates nested folders with parentId', () => {
    const folders: Folder[] = []
    let n = 0
    const id = ensureFolderForPath('docs/api', folders, (name, parentId) => ({
      id: `f${++n}`,
      name,
      order: n,
      parentId,
    }))
    expect(id).toBe('f2')
    expect(folders).toHaveLength(2)
    expect(folders[0]).toMatchObject({ name: 'docs', parentId: undefined })
    expect(folders[1]).toMatchObject({ name: 'api', parentId: 'f1' })
  })
})

import { describe, it, expect } from 'vitest'
import {
  flattenSidebarTree,
  folderHasTreeChildren,
  collectAncestorIdsForNote,
  collectExpandIdsForSearch,
} from '../src/utils/sidebarTree'
import { buildTreeIndex } from '../src/utils/treeIndex'
import type { Folder, NoteListItem } from '../src/types'

const folders: Folder[] = [
  { id: 'f1', name: 'docs', order: 0 },
  { id: 'f2', name: 'api', order: 1, parentId: 'f1' },
]

const notes: NoteListItem[] = [
  { id: 'n1', title: 'Intro', updatedAt: 1, folderId: 'f1' },
  { id: 'n2', title: 'Reference', updatedAt: 2, folderId: 'f2' },
  { id: 'n3', title: 'Root', updatedAt: 3 },
]

describe('sidebarTree', () => {
  const index = () => buildTreeIndex(folders, notes)

  it('detects notes as folder children', () => {
    const idx = index()
    expect(folderHasTreeChildren('f1', idx)).toBe(true)
    expect(folderHasTreeChildren('f2', idx)).toBe(true)
  })

  it('shows notes when folder expanded', () => {
    const collapsed = flattenSidebarTree(folders, notes, new Set())
    expect(collapsed.map((r) => r.kind)).toEqual(['folder', 'note'])

    const expanded = flattenSidebarTree(folders, notes, new Set(['f1']))
    expect(expanded.map((r) => (r.kind === 'note' ? r.note!.title : r.folder!.name))).toEqual([
      'docs',
      'api',
      'Intro',
      'Root',
    ])

    const deep = flattenSidebarTree(folders, notes, new Set(['f1', 'f2']))
    expect(deep.map((r) => (r.kind === 'note' ? r.note!.title : r.folder!.name))).toEqual([
      'docs',
      'api',
      'Reference',
      'Intro',
      'Root',
    ])
  })

  it('includes folder note counts', () => {
    const rows = flattenSidebarTree(folders, notes, new Set())
    const docs = rows.find((r) => r.kind === 'folder' && r.folder!.id === 'f1')
    expect(docs?.noteCount).toBe(2)
  })

  it('includes root notes at bottom', () => {
    const rows = flattenSidebarTree(folders, notes, new Set())
    expect(rows[rows.length - 1].note?.title).toBe('Root')
  })

  it('collects ancestor folder ids for a note', () => {
    const note = notes[1]
    expect(collectAncestorIdsForNote(note, folders)).toEqual(['f2', 'f1'])
  })

  it('collects expand ids for search matches', () => {
    const ids = collectExpandIdsForSearch(folders, [notes[1]])
    expect([...ids].sort()).toEqual(['f1', 'f2'])
  })

  it('hides folders with no matching notes when searching', () => {
    const onlyIntro = [notes[0]]
    const rows = flattenSidebarTree(folders, onlyIntro, new Set(['f1']), {
      hideEmptyFolders: true,
    })
    expect(rows.some((r) => r.kind === 'folder' && r.folder!.id === 'f2')).toBe(false)
    expect(rows.some((r) => r.kind === 'note' && r.note!.title === 'Intro')).toBe(true)
  })
})

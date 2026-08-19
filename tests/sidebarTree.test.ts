import { describe, it, expect } from 'vitest'
import {
  flattenSidebarTree,
  folderHasTreeChildren,
  collectAncestorIdsForNote,
  collectExpandIdsForSearch,
} from '../src/utils/sidebarTree'
import { MY_FOLDER_ID } from '../src/constants/myFolder'
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

  it('rootFolderId 只展开该空间子树，不含其他顶层文件夹与根笔记', () => {
    const extraFolders: Folder[] = [
      ...folders,
      { id: 'f3', name: 'other', order: 2 },
    ]
    const extraNotes: NoteListItem[] = [
      ...notes,
      { id: 'n4', title: 'OtherNote', updatedAt: 4, folderId: 'f3' },
    ]
    const rows = flattenSidebarTree(extraFolders, extraNotes, new Set(['f1']), {
      rootFolderId: 'f1',
    })
    const labels = rows.map((r) => (r.kind === 'note' ? r.note!.title : r.folder!.name))
    expect(labels).toContain('docs')
    expect(labels).toContain('api')
    expect(labels).toContain('Intro')
    expect(labels).not.toContain('other')
    expect(labels).not.toContain('OtherNote')
    expect(labels).not.toContain('Root')
  })


  it('根级置顶笔记应排在非置顶根笔记之前', () => {
    const mixedNotes: NoteListItem[] = [
      { id: 'n-readme', title: 'README', updatedAt: 100 },
      { id: 'n-pin', title: '00-学习地图', updatedAt: 50, pinned: true },
    ]
    const rows = flattenSidebarTree(folders, mixedNotes, new Set())
    const rootNotes = rows.filter((r) => r.kind === 'note').map((r) => r.note!.id)
    expect(rootNotes).toEqual(['n-pin', 'n-readme'])
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

  // ===== 置顶文件夹区测试 =====
  const pinnedFolders: Folder[] = [
    { id: 'p1', name: '置顶项目', order: 0, pinned: true },
    { id: 'p2', name: '子文档', order: 1, parentId: 'p1' },
    { id: 'n1', name: '普通文件夹', order: 2 },
  ]
  const pinnedNotes: NoteListItem[] = [
    { id: 'pn1', title: '置顶笔记', updatedAt: 1, folderId: 'p1' },
    { id: 'pn2', title: '普通笔记', updatedAt: 2, folderId: 'n1' },
  ]

  it('不传 pinnedFolderIds 时保持原有行为', () => {
    const rows = flattenSidebarTree(pinnedFolders, pinnedNotes, new Set())
    expect(rows.some((r) => r.isPinnedSeparator)).toBe(false)
    expect(rows.some((r) => r.isPinnedSection)).toBe(false)
  })

  it('传入 pinnedFolderIds 时生成置顶分隔线', () => {
    const pinnedIds = new Set(['p1'])
    const rows = flattenSidebarTree(pinnedFolders, pinnedNotes, new Set(), {
      pinnedFolderIds: pinnedIds,
    })
    expect(rows.some((r) => r.isPinnedSeparator)).toBe(true)
    expect(rows.some((r) => r.isPinnedSection && r.kind === 'folder' && r.folder?.id === 'p1')).toBe(true)
  })

  it('置顶文件夹在非置顶区不重复出现', () => {
    const pinnedIds = new Set(['p1'])
    const rows = flattenSidebarTree(pinnedFolders, pinnedNotes, new Set(), {
      pinnedFolderIds: pinnedIds,
    })
    // p1 应该只出现一次（在置顶区）
    const p1Rows = rows.filter((r) => r.kind === 'folder' && r.folder?.id === 'p1')
    expect(p1Rows).toHaveLength(1)
    expect(p1Rows[0].isPinnedSection).toBe(true)
  })

  it('展开置顶文件夹时子文件夹在置顶区显示', () => {
    const pinnedIds = new Set(['p1'])
    const rows = flattenSidebarTree(pinnedFolders, pinnedNotes, new Set(['p1']), {
      pinnedFolderIds: pinnedIds,
    })
    // p2 是 p1 的子文件夹，展开 p1 时应在置顶区显示
    const p2Rows = rows.filter((r) => r.kind === 'folder' && r.folder?.id === 'p2')
    expect(p2Rows).toHaveLength(1)
    expect(p2Rows[0].isPinnedSection).toBe(true)
  })

  it('非置顶文件夹正常显示在置顶区之后', () => {
    const pinnedIds = new Set(['p1'])
    const rows = flattenSidebarTree(pinnedFolders, pinnedNotes, new Set(), {
      pinnedFolderIds: pinnedIds,
    })
    const n1Idx = rows.findIndex((r) => r.kind === 'folder' && r.folder?.id === 'n1')
    const sepIdx = rows.findIndex((r) => r.isPinnedSeparator)
    expect(n1Idx).toBeGreaterThan(-1)
    expect(sepIdx).toBeGreaterThan(-1)
    expect(n1Idx).toBeGreaterThan(sepIdx)
  })

  it('D1 扁平化后不再导出 wrapWithMyFolder，也不注入「我的文件夹」容器', async () => {
    const mod = await import('../src/utils/sidebarTree')
    expect(mod).not.toHaveProperty('wrapWithMyFolder')

    const rows = flattenSidebarTree(folders, notes, new Set())
    expect(rows.some((row) => row.folder?.id === MY_FOLDER_ID)).toBe(false)
    expect(rows.some((row) => row.folder?.name === '我的文件夹')).toBe(false)
    const rootNote = rows.find((row) => row.kind === 'note' && row.note?.title === 'Root')
    expect(rootNote?.depth).toBe(0)
  })
})

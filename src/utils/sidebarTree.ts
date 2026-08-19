import type { Folder, NoteListItem } from '../types'
import { buildTreeIndex, type TreeIndex } from './treeIndex'

export interface SidebarTreeRow {
  kind: 'folder' | 'note'
  depth: number
  folder?: Folder
  note?: NoteListItem
  hasChildren: boolean
  /** 子树笔记数（仅 folder 行） */
  noteCount?: number
  /** 虚拟系统文件夹（历史兼容；D1 后侧栏不再生成） */
  isSystemFolder?: boolean
  /** 置顶区标记：该行属于置顶文件夹区 */
  isPinnedSection?: boolean
  /** 置顶区分隔线行 */
  isPinnedSeparator?: boolean
}

/** Folder has child folders or notes */
export function folderHasTreeChildren(
  folderId: string,
  index: TreeIndex
): boolean {
  if ((index.childrenMap.get(folderId) ?? []).length > 0) return true
  return (index.notesByFolder.get(folderId)?.length ?? 0) > 0
}

/** Folder has matching notes in itself or any descendant folder */
export function folderHasMatchingNotesInSubtree(
  folderId: string,
  index: TreeIndex
): boolean {
  if ((index.notesByFolder.get(folderId)?.length ?? 0) > 0) return true
  return (index.childrenMap.get(folderId) ?? []).some((child) =>
    folderHasMatchingNotesInSubtree(child.id, index)
  )
}

export interface FlattenSidebarTreeOptions {
  /** When searching: omit folders with no matching notes in subtree */
  hideEmptyFolders?: boolean
  index?: TreeIndex
  /** 置顶文件夹 ID 集合；提供时将顶层置顶文件夹分到置顶区 */
  pinnedFolderIds?: Set<string>
  /** 只展开该空间子树；不传则从根遍历 */
  rootFolderId?: string
}

/** Flatten folders + notes into one expandable tree */
export function flattenSidebarTree(
  folders: Folder[],
  notes: NoteListItem[],
  expandedIds: Set<string>,
  options: FlattenSidebarTreeOptions = {}
): SidebarTreeRow[] {
  const { hideEmptyFolders = false, pinnedFolderIds, rootFolderId } = options
  const index = options.index ?? buildTreeIndex(folders, notes)
  const rows: SidebarTreeRow[] = []

  function walkFolders(parentId: string | undefined, depth: number, inPinnedSection = false) {
    const children = index.childrenMap.get(parentId) ?? []
    for (const folder of children) {
      if (hideEmptyFolders && !folderHasMatchingNotesInSubtree(folder.id, index)) {
        continue
      }
      // 顶层置顶文件夹跳过普通遍历，由置顶区单独处理
      if (pinnedFolderIds && parentId === undefined && pinnedFolderIds.has(folder.id)) {
        continue
      }
      const hasChildren = folderHasTreeChildren(folder.id, index)
      rows.push({
        kind: 'folder',
        depth,
        folder,
        hasChildren,
        noteCount: countSubtreeNotes(index, folder.id),
        ...(inPinnedSection ? { isPinnedSection: true } : {}),
      })
      if (expandedIds.has(folder.id)) {
        walkFolders(folder.id, depth + 1, inPinnedSection)
        for (const note of index.notesByFolder.get(folder.id) ?? []) {
          rows.push({ kind: 'note', depth: depth + 1, note, hasChildren: false, ...(inPinnedSection ? { isPinnedSection: true } : {}) })
        }
      }
    }
  }

  if (rootFolderId) {
    const root = index.folderById.get(rootFolderId)
    if (!root) return rows
    if (hideEmptyFolders && !folderHasMatchingNotesInSubtree(root.id, index)) return rows
    rows.push({
      kind: 'folder',
      depth: 0,
      folder: root,
      hasChildren: folderHasTreeChildren(root.id, index),
      noteCount: countSubtreeNotes(index, root.id),
    })
    if (expandedIds.has(root.id)) {
      walkFolders(root.id, 1)
      for (const note of index.notesByFolder.get(root.id) ?? []) {
        rows.push({ kind: 'note', depth: 1, note, hasChildren: false })
      }
    }
    return rows
  }

  // 置顶区：仅在提供了 pinnedFolderIds 且存在置顶顶层文件夹时渲染
  if (pinnedFolderIds && pinnedFolderIds.size > 0) {
    const topLevelFolders = index.childrenMap.get(undefined) ?? []
    const pinnedTopLevel = topLevelFolders.filter((f) => pinnedFolderIds.has(f.id))

    if (pinnedTopLevel.length > 0) {
      // 置顶分隔线（PRD 要求分区标题为「常用文件夹」）
      rows.push({
        kind: 'folder',
        depth: 0,
        folder: { id: '__pinned_sep__', name: '常用文件夹', order: -2 },
        hasChildren: false,
        isPinnedSeparator: true,
      })

      for (const folder of pinnedTopLevel) {
        if (hideEmptyFolders && !folderHasMatchingNotesInSubtree(folder.id, index)) {
          continue
        }
        const hasChildren = folderHasTreeChildren(folder.id, index)
        rows.push({
          kind: 'folder',
          depth: 0,
          folder,
          hasChildren,
          noteCount: countSubtreeNotes(index, folder.id),
          isPinnedSection: true,
        })
        if (expandedIds.has(folder.id)) {
          walkFolders(folder.id, 1, true)
          for (const note of index.notesByFolder.get(folder.id) ?? []) {
            rows.push({ kind: 'note', depth: 1, note, hasChildren: false, isPinnedSection: true })
          }
        }
      }
    }
  }

  walkFolders(undefined, 0)

  for (const note of index.notesByFolder.get(undefined) ?? []) {
    rows.push({ kind: 'note', depth: 0, note, hasChildren: false })
  }

  return rows
}

function countSubtreeNotes(index: TreeIndex, folderId: string): number {
  let count = index.notesByFolder.get(folderId)?.length ?? 0
  for (const child of index.childrenMap.get(folderId) ?? []) {
    count += countSubtreeNotes(index, child.id)
  }
  return count
}

/** Folder ids that should expand to reveal a note */
export function collectAncestorIdsForNote(
  note: NoteListItem,
  folders: Folder[]
): string[] {
  if (!note.folderId) return []
  const index = buildTreeIndex(folders, [])
  const ids: string[] = []
  let current = index.folderById.get(note.folderId)
  while (current) {
    ids.push(current.id)
    current = current.parentId ? index.folderById.get(current.parentId) : undefined
  }
  return ids
}

/** 搜索时自动展开含匹配笔记的路径 */
export function collectExpandIdsForSearch(
  folders: Folder[],
  notes: NoteListItem[]
): Set<string> {
  const ids = new Set<string>()
  for (const note of notes) {
    for (const id of collectAncestorIdsForNote(note, folders)) {
      ids.add(id)
    }
  }
  return ids
}

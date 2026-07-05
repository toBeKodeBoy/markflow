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
}

/** Flatten folders + notes into one expandable tree */
export function flattenSidebarTree(
  folders: Folder[],
  notes: NoteListItem[],
  expandedIds: Set<string>,
  options: FlattenSidebarTreeOptions = {}
): SidebarTreeRow[] {
  const { hideEmptyFolders = false } = options
  const index = options.index ?? buildTreeIndex(folders, notes)
  const rows: SidebarTreeRow[] = []

  function walkFolders(parentId: string | undefined, depth: number) {
    const children = index.childrenMap.get(parentId) ?? []
    for (const folder of children) {
      if (hideEmptyFolders && !folderHasMatchingNotesInSubtree(folder.id, index)) {
        continue
      }
      const hasChildren = folderHasTreeChildren(folder.id, index)
      rows.push({
        kind: 'folder',
        depth,
        folder,
        hasChildren,
        noteCount: countSubtreeNotes(index, folder.id),
      })
      if (expandedIds.has(folder.id)) {
        walkFolders(folder.id, depth + 1)
        for (const note of index.notesByFolder.get(folder.id) ?? []) {
          rows.push({ kind: 'note', depth: depth + 1, note, hasChildren: false })
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

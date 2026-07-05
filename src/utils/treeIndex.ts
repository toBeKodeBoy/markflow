import type { Folder, NoteListItem } from '../types'
import { buildChildrenMap } from './folderTree'
import { sortNotes } from './noteSort'

export interface TreeIndex {
  folders: Folder[]
  notes: NoteListItem[]
  childrenMap: Map<string | undefined, Folder[]>
  folderById: Map<string, Folder>
  notesByFolder: Map<string | undefined, NoteListItem[]>
}

/** 构建文件夹 + 笔记索引，供侧栏/移动弹窗共用 */
export function buildTreeIndex(folders: Folder[], notes: NoteListItem[]): TreeIndex {
  const childrenMap = buildChildrenMap(folders)
  const folderById = new Map<string, Folder>()
  for (const folder of folders) {
    folderById.set(folder.id, folder)
  }

  const notesByFolder = new Map<string | undefined, NoteListItem[]>()
  for (const note of notes) {
    const key = note.folderId
    const list = notesByFolder.get(key)
    if (list) list.push(note)
    else notesByFolder.set(key, [note])
  }
  for (const list of notesByFolder.values()) {
    sortNotes(list)
  }

  return { folders, notes, childrenMap, folderById, notesByFolder }
}

/** 从根到该文件夹的祖先 id（不含自身） */
export function parentChain(index: TreeIndex, folderId: string): string[] {
  const ancestors: string[] = []
  let current = index.folderById.get(folderId)
  while (current?.parentId) {
    ancestors.unshift(current.parentId)
    current = index.folderById.get(current.parentId)
  }
  return ancestors
}

/** 文件夹及其全部后代 id */
export function subtreeFolderIds(index: TreeIndex, folderId: string): Set<string> {
  const ids = new Set<string>()
  const queue = [folderId]
  while (queue.length > 0) {
    const id = queue.shift()!
    ids.add(id)
    for (const child of index.childrenMap.get(id) ?? []) {
      if (!ids.has(child.id)) queue.push(child.id)
    }
  }
  return ids
}

/** 子树内笔记数量（含子文件夹） */
export function countNotesInSubtree(index: TreeIndex, folderId: string): number {
  const folderIds = subtreeFolderIds(index, folderId)
  return index.notes.filter((n) => n.folderId && folderIds.has(n.folderId)).length
}

/** 文件夹直接子笔记数 */
export function countDirectNotes(index: TreeIndex, folderId: string): number {
  return index.notesByFolder.get(folderId)?.length ?? 0
}

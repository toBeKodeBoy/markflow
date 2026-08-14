import type { Folder } from '../types'
import { normalizeRelativePath } from './importFolderHelpers'

export interface FolderTreeRow {
  folder: Folder
  depth: number
  hasChildren: boolean
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

/** Group folders by parentId, sorted by order */
export function buildChildrenMap(folders: Folder[]): Map<string | undefined, Folder[]> {
  const map = new Map<string | undefined, Folder[]>()
  for (const folder of folders) {
    const key = folder.parentId
    const list = map.get(key)
    if (list) list.push(folder)
    else map.set(key, [folder])
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.order - b.order)
  }
  return map
}

/** Flatten visible folder rows for sidebar tree (respecting expanded ids) */
export function flattenFolderTree(folders: Folder[], expandedIds: Set<string>): FolderTreeRow[] {
  const childrenMap = buildChildrenMap(folders)
  const rows: FolderTreeRow[] = []

  function walk(parentId: string | undefined, depth: number) {
    const children = childrenMap.get(parentId) ?? []
    for (const folder of children) {
      const childList = childrenMap.get(folder.id) ?? []
      const hasChildren = childList.length > 0
      rows.push({ folder, depth, hasChildren })
      if (hasChildren && expandedIds.has(folder.id)) {
        walk(folder.id, depth + 1)
      }
    }
  }

  walk(undefined, 0)
  return rows
}

/** Collect folder id and all descendant folder ids */
export function collectDescendantFolderIds(folderId: string, folders: Folder[]): Set<string> {
  const ids = new Set<string>()
  const queue = [folderId]
  while (queue.length > 0) {
    const id = queue.shift()!
    ids.add(id)
    for (const folder of folders) {
      if (folder.parentId === id && !ids.has(folder.id)) {
        queue.push(folder.id)
      }
    }
  }
  return ids
}

/** 同级文件夹的下一个 order 值 */
export function nextSiblingOrder(
  folders: Folder[],
  parentId?: string,
  excludeId?: string
): number {
  const siblings = folders.filter((f) => f.parentId === parentId && f.id !== excludeId)
  if (siblings.length === 0) return 0
  return Math.max(...siblings.map((f) => f.order)) + 1
}

/** 移动文件夹是否形成环 */
export function wouldCreateFolderCycle(
  folders: Folder[],
  folderId: string,
  newParentId: string | undefined
): boolean {
  if (!newParentId) return false
  if (newParentId === folderId) return true
  return collectDescendantFolderIds(folderId, folders).has(newParentId)
}

export interface FolderDeleteImpact {
  folderCount: number
  noteCount: number
  /** 删除后笔记移入的文件夹；undefined 表示根目录 */
  moveNotesTo: string | undefined
}

/** 删除文件夹的影响统计 */
export function getFolderDeleteImpact(
  folders: Folder[],
  notes: { folderId?: string }[],
  folderId: string
): FolderDeleteImpact {
  const target = folders.find((f) => f.id === folderId)
  const idsToDelete = collectDescendantFolderIds(folderId, folders)
  const noteCount = notes.filter((n) => n.folderId && idsToDelete.has(n.folderId)).length
  return {
    folderCount: idsToDelete.size,
    noteCount,
    moveNotesTo: target?.parentId,
  }
}

/** Ancestor folder ids from root to parent (excluding self) */
export function collectAncestorFolderIds(folderId: string, folders: Folder[]): string[] {
  const ancestors: string[] = []
  let current = folders.find((f) => f.id === folderId)
  while (current?.parentId) {
    ancestors.unshift(current.parentId)
    current = folders.find((f) => f.id === current!.parentId)
  }
  return ancestors
}

/** Display path like "docs / api" */
export function getFolderPathLabel(folders: Folder[], folderId: string): string {
  const parts: string[] = []
  let id: string | undefined = folderId
  while (id) {
    const folder = folders.find((f) => f.id === id)
    if (!folder) break
    parts.unshift(folder.name)
    id = folder.parentId
  }
  return parts.join(' / ')
}

function findFolderByNameAndParent(
  folders: Folder[],
  name: string,
  parentId: string | undefined
): Folder | undefined {
  return folders.find((f) => f.name === name && f.parentId === parentId)
}

/**
 * Convert legacy flat path folder names ("docs/api") into a parentId tree.
 * Preserves leaf folder ids so existing note folderId references stay valid.
 */
export function migrateLegacyPathFolders(folders: Folder[]): { folders: Folder[]; changed: boolean } {
  const legacy = folders.filter((f) => f.name.includes('/'))
  if (legacy.length === 0) return { folders, changed: false }

  const result = folders.filter((f) => !f.name.includes('/'))

  for (const leaf of legacy) {
    const segments = normalizeRelativePath(leaf.name).split('/').filter(Boolean)
    if (segments.length === 0) continue

    let parentId: string | undefined
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const isLast = i === segments.length - 1

      if (isLast) {
        result.push({ ...leaf, name: segment, parentId })
        break
      }

      let existing = findFolderByNameAndParent(result, segment, parentId)
      if (!existing) {
        existing = {
          id: generateId(),
          name: segment,
          order: leaf.order,
          parentId,
        }
        result.push(existing)
      }
      parentId = existing.id
    }
  }

  return { folders: result, changed: true }
}

/**
 * 计算文件夹在树中的深度（根目录为 0）。
 * 复用 collectAncestorFolderIds：深度 = 祖先链长度。
 * 不存在的 ID 返回 -1。
 */
export function getFolderDepth(folders: Folder[], folderId: string): number {
  const target = folders.find((f) => f.id === folderId)
  if (!target) return -1
  return collectAncestorFolderIds(folderId, folders).length
}

/**
 * 校验将新文件夹挂到 parentId 下是否会超过最大深度。
 * parentId 为 undefined（根目录）始终返回 true。
 * parentId 不存在返回 false。
 */
export function validateFolderDepth(
  folders: Folder[],
  parentId: string | undefined,
  maxDepth: number = 20
): boolean {
  if (parentId === undefined) return true
  const depth = getFolderDepth(folders, parentId)
  if (depth === -1) return false
  return depth + 1 <= maxDepth
}

/**
 * 按指定顺序重算同级文件夹的 order 字段（0, 1, 2, ...）。
 * 非同级或不在 orderedIds 中的文件夹 order 不变。
 * 返回新的 Folder 数组，不修改原数组。
 */
export function reorderSiblingFolders(
  folders: Folder[],
  parentId: string | undefined,
  orderedIds: string[]
): Folder[] {
  const orderMap = new Map<string, number>()
  orderedIds.forEach((id, index) => orderMap.set(id, index))

  return folders.map((folder) => {
    if (folder.parentId === parentId && orderMap.has(folder.id)) {
      return { ...folder, order: orderMap.get(folder.id)! }
    }
    return { ...folder }
  })
}

/**
 * 过滤出未在回收站中的文件夹（trashAt === undefined）。
 */
export function filterActiveFolders(folders: Folder[]): Folder[] {
  return folders.filter((f) => f.trashAt === undefined)
}

/**
 * 返回置顶文件夹（pinned === true）。
 */
export function getPinnedFolders(folders: Folder[]): Folder[] {
  return folders.filter((f) => f.pinned === true)
}

/**
 * 为缺少时间戳与 pinned 字段的文件夹补默认值。
 * - createdAt / updatedAt 缺失补 Date.now()
 * - pinned 缺失补 false
 * 已有值不修改，返回新数组。
 */
export function migrateFolderTimestamps(folders: Folder[]): Folder[] {
  const now = Date.now()
  return folders.map((folder) => ({
    ...folder,
    createdAt: folder.createdAt ?? now,
    updatedAt: folder.updatedAt ?? now,
    pinned: folder.pinned ?? false,
  }))
}

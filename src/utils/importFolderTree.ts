import type { ImportFolderFile } from '../types/import'
import {
  compareImportFileNames,
  compareImportFolderNames,
  getBasename,
  normalizeRelativePath,
} from './importFolderHelpers'

export interface ImportFileTreeNode {
  path: string
  name: string
  kind: 'folder' | 'file'
  file?: ImportFolderFile
  children: ImportFileTreeNode[]
}

export interface ImportFileTreeRow {
  node: ImportFileTreeNode
  depth: number
}

/** Build folder/file tree from flat scan results */
export function buildImportFileTree(files: ImportFolderFile[]): ImportFileTreeNode[] {
  const root: ImportFileTreeNode[] = []
  const folderMap = new Map<string, ImportFileTreeNode>()

  for (const file of files) {
    const normalized = normalizeRelativePath(file.relativePath)
    const parts = normalized.split('/')
    const fileName = parts.pop()!
    let parentChildren = root
    let dirPath = ''

    for (const part of parts) {
      dirPath = dirPath ? `${dirPath}/${part}` : part
      let folder = folderMap.get(dirPath)
      if (!folder) {
        folder = { path: dirPath, name: part, kind: 'folder', children: [] }
        folderMap.set(dirPath, folder)
        parentChildren.push(folder)
      }
      parentChildren = folder.children
    }

    parentChildren.push({
      path: normalized,
      name: fileName || getBasename(normalized),
      kind: 'file',
      file,
      children: [],
    })
  }

  sortImportTreeNodes(root)
  return root
}

function sortImportTreeNodes(nodes: ImportFileTreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
    if (a.kind === 'folder' && b.kind === 'folder') {
      return compareImportFolderNames(a.name, b.name)
    }
    return compareImportFileNames(a.name, b.name)
  })

  for (const node of nodes) {
    if (node.kind === 'folder' && node.children.length > 0) {
      sortImportTreeNodes(node.children)
    }
  }
}

/** Visible rows respecting expanded folder paths */
export function flattenImportFileTree(
  nodes: ImportFileTreeNode[],
  expandedPaths: Set<string>,
  depth = 0
): ImportFileTreeRow[] {
  const rows: ImportFileTreeRow[] = []
  for (const node of nodes) {
    rows.push({ node, depth })
    if (node.kind === 'folder' && expandedPaths.has(node.path) && node.children.length > 0) {
      rows.push(...flattenImportFileTree(node.children, expandedPaths, depth + 1))
    }
  }
  return rows
}

/** All file relative paths under a node */
export function collectImportFilePaths(node: ImportFileTreeNode): string[] {
  if (node.kind === 'file') return [node.path]
  return node.children.flatMap(collectImportFilePaths)
}

/** Count importable files in subtree */
export function countImportFiles(node: ImportFileTreeNode): number {
  if (node.kind === 'file') return 1
  return node.children.reduce((sum, child) => sum + countImportFiles(child), 0)
}

export type ImportTreeCheckState = 'all' | 'some' | 'none'

/** Checkbox state for a folder node */
export function getImportTreeCheckState(
  node: ImportFileTreeNode,
  selected: Set<string>
): ImportTreeCheckState {
  const paths = collectImportFilePaths(node)
  if (paths.length === 0) return 'none'
  const hit = paths.filter((p) => selected.has(p)).length
  if (hit === 0) return 'none'
  if (hit === paths.length) return 'all'
  return 'some'
}

/** Top-level folder paths for default expand */
export function getTopLevelFolderPaths(nodes: ImportFileTreeNode[]): string[] {
  return nodes.filter((n) => n.kind === 'folder').map((n) => n.path)
}

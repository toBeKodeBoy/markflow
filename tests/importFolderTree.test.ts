import { describe, it, expect } from 'vitest'
import {
  buildImportFileTree,
  collectImportFilePaths,
  countImportFiles,
  flattenImportFileTree,
  getImportTreeCheckState,
  getTopLevelFolderPaths,
} from '../src/utils/importFolderTree'
import type { ImportFolderFile } from '../src/types/import'

function file(relativePath: string): ImportFolderFile {
  return { relativePath, content: '# x', images: [] }
}

describe('importFolderTree', () => {
  describe('buildImportFileTree', () => {
    it('groups files under folder nodes', () => {
      const tree = buildImportFileTree([
        file('readme.md'),
        file('docs/api.md'),
        file('docs/guide/setup.md'),
      ])
      expect(tree.map((n) => n.name)).toEqual(['docs', 'readme.md'])
      expect(tree[0].kind).toBe('folder')
      expect(tree[0].children.map((n) => n.name)).toEqual(['guide', 'api.md'])
      expect(tree[0].children[0].children[0].name).toBe('setup.md')
    })

    it('sorts sibling folders by leading integer prefix and files by name', () => {
      const tree = buildImportFileTree([
        file('附录/z.md'),
        file('02-进阶/b.md'),
        file('01-基础/c.md'),
        file('01-基础/a.md'),
      ])

      expect(tree.map((n) => n.name)).toEqual(['01-基础', '02-进阶', '附录'])
      expect(tree[0].children.map((n) => n.name)).toEqual(['a.md', 'c.md'])
    })
  })

  describe('flattenImportFileTree', () => {
    it('shows children only when folder is expanded', () => {
      const tree = buildImportFileTree([file('docs/a.md'), file('docs/b.md')])
      const collapsed = flattenImportFileTree(tree, new Set())
      expect(collapsed.map((r) => r.node.name)).toEqual(['docs'])

      const expanded = flattenImportFileTree(tree, new Set(['docs']))
      expect(expanded.map((r) => r.node.name)).toEqual(['docs', 'a.md', 'b.md'])
    })
  })

  describe('selection helpers', () => {
    it('collects file paths in subtree', () => {
      const tree = buildImportFileTree([file('docs/a.md'), file('docs/b.md')])
      const folder = tree[0]
      expect(collectImportFilePaths(folder)).toEqual(['docs/a.md', 'docs/b.md'])
      expect(countImportFiles(folder)).toBe(2)
    })

    it('reports folder checkbox state', () => {
      const tree = buildImportFileTree([file('docs/a.md'), file('docs/b.md')])
      const folder = tree[0]
      expect(getImportTreeCheckState(folder, new Set())).toBe('none')
      expect(getImportTreeCheckState(folder, new Set(['docs/a.md']))).toBe('some')
      expect(getImportTreeCheckState(folder, new Set(['docs/a.md', 'docs/b.md']))).toBe('all')
    })
  })

  describe('getTopLevelFolderPaths', () => {
    it('returns only root-level folders', () => {
      const tree = buildImportFileTree([file('docs/a.md'), file('readme.md'), file('img/x.png')])
      expect(getTopLevelFolderPaths(tree)).toEqual(['docs', 'img'])
    })
  })
})

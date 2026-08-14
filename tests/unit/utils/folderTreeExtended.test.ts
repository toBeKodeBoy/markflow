import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getFolderDepth,
  validateFolderDepth,
  reorderSiblingFolders,
  filterActiveFolders,
  getPinnedFolders,
  migrateFolderTimestamps,
} from '../../../src/utils/folderTree'
import type { Folder } from '../../../src/types'

/** 构造文件夹对象，默认 order=0 */
function f(
  id: string,
  name: string,
  parentId?: string,
  order = 0,
  extra?: Partial<Folder>
): Folder {
  return { id, name, order, parentId, ...extra }
}

describe('folderTree extended utilities', () => {
  // ============================================================
  // getFolderDepth
  // ============================================================
  describe('getFolderDepth', () => {
    it('根目录文件夹返回 0', () => {
      const folders = [f('root', 'Root')]
      expect(getFolderDepth(folders, 'root')).toBe(0)
    })

    it('一级子文件夹返回 1', () => {
      const folders = [f('root', 'Root'), f('child', 'Child', 'root')]
      expect(getFolderDepth(folders, 'child')).toBe(1)
    })

    it('三级嵌套返回 3', () => {
      const folders = [
        f('l0', 'Level0'),
        f('l1', 'Level1', 'l0'),
        f('l2', 'Level2', 'l1'),
        f('l3', 'Level3', 'l2'),
      ]
      expect(getFolderDepth(folders, 'l3')).toBe(3)
    })

    it('不存在的 ID 返回 -1', () => {
      const folders = [f('root', 'Root')]
      expect(getFolderDepth(folders, 'nonexistent')).toBe(-1)
    })
  })

  // ============================================================
  // validateFolderDepth
  // ============================================================
  describe('validateFolderDepth', () => {
    it('parentId 为 undefined（根目录）始终返回 true', () => {
      const folders = [f('root', 'Root')]
      expect(validateFolderDepth(folders, undefined, 20)).toBe(true)
      expect(validateFolderDepth(folders, undefined, 1)).toBe(true)
    })

    it('parentId 在 maxDepth 内返回 true', () => {
      // root(0) → a(1) → b(2)，maxDepth=5，子级深度=3，在范围内
      const folders = [
        f('root', 'Root'),
        f('a', 'A', 'root'),
        f('b', 'B', 'a'),
      ]
      expect(validateFolderDepth(folders, 'b', 5)).toBe(true)
    })

    it('parentId 超过 maxDepth 返回 false', () => {
      // root(0) → a(1) → b(2)，maxDepth=2，子级深度=3，超出
      const folders = [
        f('root', 'Root'),
        f('a', 'A', 'root'),
        f('b', 'B', 'a'),
      ]
      expect(validateFolderDepth(folders, 'b', 2)).toBe(false)
    })

    it('默认 maxDepth 为 20', () => {
      // 构建 20 层嵌套
      const folders: Folder[] = [f('d0', 'Depth0')]
      for (let i = 1; i <= 19; i++) {
        folders.push(f(`d${i}`, `Depth${i}`, `d${i - 1}`))
      }
      // d18 深度=18，子级深度=19，在 20 内 → true
      expect(validateFolderDepth(folders, 'd18')).toBe(true)
      // d19 深度=19，子级深度=20，等于 20 → 在范围内 → true
      expect(validateFolderDepth(folders, 'd19')).toBe(true)
    })
  })

  // ============================================================
  // reorderSiblingFolders
  // ============================================================
  describe('reorderSiblingFolders', () => {
    it('重算同级文件夹的 order 字段（0, 1, 2, ...）', () => {
      const folders = [
        f('a', 'A', undefined, 5),
        f('b', 'B', undefined, 3),
        f('c', 'C', undefined, 7),
      ]
      const result = reorderSiblingFolders(folders, undefined, ['b', 'a', 'c'])
      expect(result.find((x) => x.id === 'b')!.order).toBe(0)
      expect(result.find((x) => x.id === 'a')!.order).toBe(1)
      expect(result.find((x) => x.id === 'c')!.order).toBe(2)
    })

    it('非同级的文件夹 order 不变', () => {
      const folders = [
        f('a', 'A', undefined, 5),
        f('b', 'B', undefined, 3),
        f('child', 'Child', 'a', 9),
      ]
      const result = reorderSiblingFolders(folders, undefined, ['b', 'a'])
      // child 不在 orderedIds 中且 parentId 不同，order 应保持 9
      expect(result.find((x) => x.id === 'child')!.order).toBe(9)
    })

    it('返回新的 Folder 数组（不修改原数组）', () => {
      const folders = [
        f('a', 'A', undefined, 5),
        f('b', 'B', undefined, 3),
      ]
      const original = folders.map((x) => ({ ...x }))
      const result = reorderSiblingFolders(folders, undefined, ['b', 'a'])
      // 原数组不变
      expect(folders).toEqual(original)
      // 结果是新数组
      expect(result).not.toBe(folders)
    })
  })

  // ============================================================
  // filterActiveFolders
  // ============================================================
  describe('filterActiveFolders', () => {
    it('过滤掉 trashAt !== undefined 的文件夹', () => {
      const folders = [
        f('a', 'A', undefined, 0, { trashAt: 123456 }),
        f('b', 'B', undefined, 0),
        f('c', 'C', undefined, 0, { trashAt: 789 }),
      ]
      const result = filterActiveFolders(folders)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('b')
    })

    it('无 trashAt 的文件夹全部保留', () => {
      const folders = [
        f('a', 'A'),
        f('b', 'B', 'a'),
      ]
      const result = filterActiveFolders(folders)
      expect(result).toHaveLength(2)
    })
  })

  // ============================================================
  // getPinnedFolders
  // ============================================================
  describe('getPinnedFolders', () => {
    it('返回 pinned === true 的文件夹', () => {
      const folders = [
        f('a', 'A', undefined, 0, { pinned: true }),
        f('b', 'B', undefined, 0, { pinned: false }),
        f('c', 'C', undefined, 0),
      ]
      const result = getPinnedFolders(folders)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('a')
    })

    it('pinned 为 undefined 或 false 的不返回', () => {
      const folders = [
        f('a', 'A', undefined, 0, { pinned: undefined }),
        f('b', 'B', undefined, 0, { pinned: false }),
        f('c', 'C', undefined, 0, { pinned: true }),
      ]
      const result = getPinnedFolders(folders)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('c')
    })
  })

  // ============================================================
  // migrateFolderTimestamps
  // ============================================================
  describe('migrateFolderTimestamps', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-15T00:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('为缺少 createdAt 的文件夹补 Date.now()', () => {
      const folders = [f('a', 'A', undefined, 0)]
      const result = migrateFolderTimestamps(folders)
      expect(result[0].createdAt).toBe(Date.now())
    })

    it('为缺少 updatedAt 的文件夹补 Date.now()', () => {
      const folders = [f('a', 'A', undefined, 0)]
      const result = migrateFolderTimestamps(folders)
      expect(result[0].updatedAt).toBe(Date.now())
    })

    it('为缺少 pinned 的文件夹补 false', () => {
      const folders = [f('a', 'A', undefined, 0)]
      const result = migrateFolderTimestamps(folders)
      expect(result[0].pinned).toBe(false)
    })

    it('不修改已有值', () => {
      const folders = [
        f('a', 'A', undefined, 0, {
          createdAt: 1000,
          updatedAt: 2000,
          pinned: true,
        }),
      ]
      const result = migrateFolderTimestamps(folders)
      expect(result[0].createdAt).toBe(1000)
      expect(result[0].updatedAt).toBe(2000)
      expect(result[0].pinned).toBe(true)
    })

    it('返回新数组（不修改原数组）', () => {
      const folders = [f('a', 'A', undefined, 0)]
      const original = folders.map((x) => ({ ...x }))
      const result = migrateFolderTimestamps(folders)
      expect(folders).toEqual(original)
      expect(result).not.toBe(folders)
    })
  })
})

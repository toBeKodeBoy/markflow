/**
 * 文件夹管理系统类型层架构约束（TDD）
 *
 * 运行时：通过源码模式匹配验证类型定义已写入 src/types/index.ts
 * 编译期：通过 expectTypeOf 索引类型断言 + 类型标注对象赋值验证类型正确性
 */
import { describe, it, expect, expectTypeOf } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type {
  Folder,
  TrashFolderEntry,
  AppSettings,
  MarkFlowBridge,
} from '../../src/types'

const root = resolve(import.meta.dirname, '../..')

function readSrc(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8')
}

// ─── Folder 接口扩展 ────────────────────────────────────────────

describe('Folder 接口字段扩展', () => {
  const src = readSrc('src/types/index.ts')

  it('源码定义 pinned?: boolean', () => {
    expect(src).toMatch(/export interface Folder[\s\S]*?pinned\?:\s*boolean/)
  })

  it('源码定义 trashAt?: number', () => {
    expect(src).toMatch(/export interface Folder[\s\S]*?trashAt\?:\s*number/)
  })

  it('源码定义 createdAt?: number', () => {
    expect(src).toMatch(/export interface Folder[\s\S]*?createdAt\?:\s*number/)
  })

  it('源码定义 updatedAt?: number', () => {
    expect(src).toMatch(/export interface Folder[\s\S]*?updatedAt\?:\s*number/)
  })

  it('Folder 不含 depth 字段', () => {
    expect(src).not.toMatch(/export interface Folder[\s\S]*?depth\b/)
  })

  it('支持包含全部新字段的 Folder 对象', () => {
    const folder: Folder = {
      id: 'f1',
      name: '测试文件夹',
      order: 0,
      pinned: true,
      trashAt: 1234567890,
      createdAt: 1234567890,
      updatedAt: 1234567890,
    }
    expect(folder.pinned).toBe(true)
    expect(folder.trashAt).toBe(1234567890)
    expect(folder.createdAt).toBe(1234567890)
    expect(folder.updatedAt).toBe(1234567890)
  })

  it('支持不含新字段的 Folder 对象（向后兼容）', () => {
    const folder: Folder = {
      id: 'f2',
      name: '旧文件夹',
      order: 1,
    }
    expect(folder.pinned).toBeUndefined()
    expect(folder.trashAt).toBeUndefined()
    expect(folder.createdAt).toBeUndefined()
    expect(folder.updatedAt).toBeUndefined()
  })

  it('类型断言：Folder.pinned 为 boolean | undefined', () => {
    expectTypeOf<Folder['pinned']>().toEqualTypeOf<boolean | undefined>()
  })

  it('类型断言：Folder.trashAt 为 number | undefined', () => {
    expectTypeOf<Folder['trashAt']>().toEqualTypeOf<number | undefined>()
  })

  it('类型断言：Folder.createdAt 为 number | undefined', () => {
    expectTypeOf<Folder['createdAt']>().toEqualTypeOf<number | undefined>()
  })

  it('类型断言：Folder.updatedAt 为 number | undefined', () => {
    expectTypeOf<Folder['updatedAt']>().toEqualTypeOf<number | undefined>()
  })
})

// ─── TrashFolderEntry 接口 ───────────────────────────────────────

describe('TrashFolderEntry 接口结构', () => {
  const src = readSrc('src/types/index.ts')

  it('源码存在 TrashFolderEntry 接口定义', () => {
    expect(src).toMatch(/export interface TrashFolderEntry\b/)
  })

  it('源码定义 folder: Folder', () => {
    expect(src).toMatch(/export interface TrashFolderEntry[\s\S]*?folder:\s*Folder/)
  })

  it('源码定义 descendantFolders: Folder[]', () => {
    expect(src).toMatch(
      /export interface TrashFolderEntry[\s\S]*?descendantFolders:\s*Folder\[\]/,
    )
  })

  it('源码定义 noteIds: string[]', () => {
    expect(src).toMatch(
      /export interface TrashFolderEntry[\s\S]*?noteIds:\s*string\[\]/,
    )
  })

  it('源码定义 deletedAt: number', () => {
    expect(src).toMatch(
      /export interface TrashFolderEntry[\s\S]*?deletedAt:\s*number/,
    )
  })

  it('源码定义 deletedBy 为 user | auto 联合类型', () => {
    expect(src).toMatch(
      /export interface TrashFolderEntry[\s\S]*?deletedBy:\s*'user'\s*\|\s*'auto'/,
    )
  })

  it('源码定义 originalParentId?: string', () => {
    expect(src).toMatch(
      /export interface TrashFolderEntry[\s\S]*?originalParentId\?:\s*string/,
    )
  })

  it('deletedBy 接受 user', () => {
    const entry: TrashFolderEntry = {
      folder: { id: 'f1', name: '文件夹', order: 0 },
      descendantFolders: [],
      noteIds: ['n1', 'n2'],
      deletedAt: 1234567890,
      deletedBy: 'user',
    }
    expect(entry.deletedBy).toBe('user')
  })

  it('deletedBy 接受 auto', () => {
    const entry: TrashFolderEntry = {
      folder: { id: 'f2', name: '文件夹2', order: 1 },
      descendantFolders: [],
      noteIds: [],
      deletedAt: 1234567891,
      deletedBy: 'auto',
    }
    expect(entry.deletedBy).toBe('auto')
  })

  it('originalParentId 为可选字段', () => {
    const entry: TrashFolderEntry = {
      folder: { id: 'f1', name: '文件夹', order: 0 },
      descendantFolders: [],
      noteIds: [],
      deletedAt: 1234567890,
      deletedBy: 'user',
    }
    expect(entry.originalParentId).toBeUndefined()
  })

  it('支持含 originalParentId 的完整条目', () => {
    const entry: TrashFolderEntry = {
      folder: { id: 'f1', name: '文件夹', order: 0 },
      descendantFolders: [
        { id: 'f2', name: '子文件夹', order: 0, parentId: 'f1' },
      ],
      noteIds: ['n1', 'n2', 'n3'],
      deletedAt: 1234567890,
      deletedBy: 'user',
      originalParentId: 'parent-001',
    }
    expect(entry.originalParentId).toBe('parent-001')
    expect(entry.descendantFolders).toHaveLength(1)
    expect(entry.noteIds).toHaveLength(3)
  })

  it('类型断言：TrashFolderEntry.folder 为 Folder', () => {
    expectTypeOf<TrashFolderEntry['folder']>().toEqualTypeOf<Folder>()
  })

  it('类型断言：TrashFolderEntry.descendantFolders 为 Folder[]', () => {
    expectTypeOf<TrashFolderEntry['descendantFolders']>().toEqualTypeOf<Folder[]>()
  })

  it('类型断言：TrashFolderEntry.noteIds 为 string[]', () => {
    expectTypeOf<TrashFolderEntry['noteIds']>().toEqualTypeOf<string[]>()
  })

  it('类型断言：TrashFolderEntry.deletedAt 为 number', () => {
    expectTypeOf<TrashFolderEntry['deletedAt']>().toEqualTypeOf<number>()
  })

  it('类型断言：TrashFolderEntry.deletedBy 为 user | auto', () => {
    expectTypeOf<TrashFolderEntry['deletedBy']>().toEqualTypeOf<'user' | 'auto'>()
  })

  it('类型断言：TrashFolderEntry.originalParentId 为 string | undefined', () => {
    expectTypeOf<TrashFolderEntry['originalParentId']>().toEqualTypeOf<string | undefined>()
  })
})

// ─── AppSettings 扩展 ──────────────────────────────────────────

describe('AppSettings 支持 trashRetentionDays', () => {
  const src = readSrc('src/types/index.ts')

  it('源码定义 trashRetentionDays?: number', () => {
    expect(src).toMatch(/trashRetentionDays\?:\s*number/)
  })

  it('支持带 trashRetentionDays 的 settings 对象', () => {
    const settings: AppSettings = {
      theme: 'light',
      fontSize: 14,
      editorFontFamily: 'monospace',
      previewVisible: true,
      sidebarVisible: true,
      trashRetentionDays: 30,
    }
    expect(settings.trashRetentionDays).toBe(30)
  })

  it('支持不带 trashRetentionDays 的 settings 对象（向后兼容）', () => {
    const settings: AppSettings = {
      theme: 'dark',
      fontSize: 16,
      editorFontFamily: 'monospace',
      previewVisible: true,
      sidebarVisible: false,
    }
    expect(settings.trashRetentionDays).toBeUndefined()
  })

  it('类型断言：AppSettings.trashRetentionDays 为 number | undefined', () => {
    expectTypeOf<AppSettings['trashRetentionDays']>().toEqualTypeOf<number | undefined>()
  })
})

// ─── MarkFlowBridge 文件夹回收站方法 ───────────────────────────

describe('MarkFlowBridge 文件夹回收站方法', () => {
  const src = readSrc('src/types/index.ts')

  it('源码定义 getTrashFolders: () => TrashFolderEntry[]', () => {
    expect(src).toMatch(/getTrashFolders:\s*\(\)\s*=>\s*TrashFolderEntry\[\]/)
  })

  it('源码定义 saveTrashFolders: (entries: TrashFolderEntry[]) => void', () => {
    expect(src).toMatch(
      /saveTrashFolders:\s*\(entries:\s*TrashFolderEntry\[\]\)\s*=>\s*void/,
    )
  })

  it('类型断言：getTrashFolders 返回 TrashFolderEntry[]', () => {
    expectTypeOf<
      ReturnType<MarkFlowBridge['getTrashFolders']>
    >().toEqualTypeOf<TrashFolderEntry[]>()
  })

  it('类型断言：saveTrashFolders 参数为 TrashFolderEntry[]', () => {
    expectTypeOf<
      Parameters<MarkFlowBridge['saveTrashFolders']>[0]
    >().toEqualTypeOf<TrashFolderEntry[]>()
  })

  it('类型断言：saveTrashFolders 返回 void', () => {
    expectTypeOf<
      ReturnType<MarkFlowBridge['saveTrashFolders']>
    >().toEqualTypeOf<void>()
  })
})

import { describe, it, expect } from 'vitest'
import {
  nextSiblingOrder,
  wouldCreateFolderCycle,
  getFolderDeleteImpact,
} from '../../../src/utils/folderTree'
import type { Folder } from '../../../src/types'

function f(id: string, name: string, parentId?: string, order = 0): Folder {
  return { id, name, order, parentId }
}

describe('folderTree operations', () => {
  it('nextSiblingOrder returns max + 1 among siblings', () => {
    const folders = [f('a', 'a', undefined, 0), f('b', 'b', undefined, 3)]
    expect(nextSiblingOrder(folders, undefined)).toBe(4)
    expect(nextSiblingOrder(folders, undefined, 'a')).toBe(4)
  })

  it('wouldCreateFolderCycle detects invalid moves', () => {
    const folders = [f('a', 'docs'), f('b', 'api', 'a')]
    expect(wouldCreateFolderCycle(folders, 'a', 'b')).toBe(true)
    expect(wouldCreateFolderCycle(folders, 'b', 'a')).toBe(false)
  })

  it('getFolderDeleteImpact reports move target', () => {
    const folders = [f('a', 'docs'), f('b', 'api', 'a')]
    const impact = getFolderDeleteImpact(folders, [{ folderId: 'b' }], 'b')
    expect(impact.folderCount).toBe(1)
    expect(impact.noteCount).toBe(1)
    expect(impact.moveNotesTo).toBe('a')
  })
})

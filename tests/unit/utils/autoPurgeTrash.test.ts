import { describe, expect, it, vi } from 'vitest'
import { autoPurgeTrash } from '../../../src/utils/autoPurgeTrash'
import { useNoteStore } from '../../../src/stores/note'

vi.mock('../../../src/stores/note', () => ({
  useNoteStore: vi.fn(),
}))

describe('autoPurgeTrash', () => {
  it('非法保留天数应回退到默认值，并保留缺失 deletedAt 的历史条目', async () => {
    const permanentDeleteNote = vi.fn()
    const permanentDeleteFolder = vi.fn()
    vi.mocked(useNoteStore).mockReturnValue({
      getTrashNotes: () => [{ id: 'legacy-note' }],
      getTrashFolders: () => [{ folder: { id: 'legacy-folder' } }],
      permanentDeleteNote,
      permanentDeleteFolder,
    } as never)

    const result = await autoPurgeTrash(Number.NaN)

    expect(result).toBe(false)
    expect(permanentDeleteNote).not.toHaveBeenCalled()
    expect(permanentDeleteFolder).not.toHaveBeenCalled()
  })

  it('清理前应核对删除时间，避免恢复后同 ID 的新条目被误删', async () => {
    const permanentDeleteNote = vi.fn()
    const oldDeletedAt = Date.now() - 31 * 24 * 60 * 60 * 1000
    const oldNotes = [{ id: 'same-id', deletedAt: oldDeletedAt }]
    const currentNotes = [{ id: 'same-id', deletedAt: Date.now() }]
    let reads = 0
    vi.mocked(useNoteStore).mockReturnValue({
      getTrashNotes: () => (reads++ === 0 ? oldNotes : currentNotes),
      getTrashFolders: () => [],
      permanentDeleteNote,
      permanentDeleteFolder: vi.fn(),
    } as never)

    const result = await autoPurgeTrash(30)

    expect(result).toBe(false)
    expect(permanentDeleteNote).not.toHaveBeenCalled()
  })
})

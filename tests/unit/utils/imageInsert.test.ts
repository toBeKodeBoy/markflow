import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNoteStore } from '../../../src/stores/note'
import { saveImageAsMarkdown } from '../../../src/utils/imageInsert'

const { compressImageMock, blobToBase64Mock } = vi.hoisted(() => ({
  compressImageMock: vi.fn(),
  blobToBase64Mock: vi.fn(),
}))

vi.mock('../../../src/utils/imageCompress', () => ({
  compressImage: compressImageMock,
  blobToBase64: blobToBase64Mock,
}))

describe('saveImageAsMarkdown', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
    compressImageMock.mockResolvedValue({
      blob: new Blob(['img'], { type: 'image/png' }),
      mimeType: 'image/png',
      width: 100,
      height: 100,
      size: 3,
    })
    blobToBase64Mock.mockResolvedValue('Zm9v')
    vi.mocked(window.markflow.ensureDirectory).mockReturnValue({ ok: true })
    vi.mocked(window.markflow.writeAssetFile).mockReturnValue({
      ok: true,
      path: 'D:\\docs\\note.assets\\image-1.png',
    })
    vi.mocked(window.markflow.pathExists).mockReturnValue(false)
  })

  it('uses internal asset markdown for unbound notes', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# Demo')
    const saveFromFileSpy = vi.spyOn((await import('../../../src/composables/useAssetStorage')).getAssetStorage(), 'saveFromFile')
    saveFromFileSpy.mockResolvedValue('asset-1')

    const file = new File(['demo'], 'demo.png', { type: 'image/png' })
    const markdown = await saveImageAsMarkdown(file)

    expect(markdown).toBe('![demo](markflow-asset://asset-1)')
  })

  it('writes file-system path for file-bound notes', async () => {
    const store = useNoteStore()
    const note = store.createNoteWithContent('# Demo', {
      workingFilePath: 'D:\\docs\\note.md',
      assetDirectoryPath: 'D:\\docs\\note.assets',
      assetPathMode: 'file-bound',
      assetLinkStyle: 'relative',
    } as never)
    store.openNote(note.id)

    const file = new File(['demo'], 'demo.png', { type: 'image/png' })
    const markdown = await saveImageAsMarkdown(file)

    expect(window.markflow.ensureDirectory).toHaveBeenCalledWith('D:\\docs\\note.assets')
    expect(window.markflow.writeAssetFile).toHaveBeenCalledWith(
      'D:\\docs\\note.assets\\demo-1.png',
      'Zm9v'
    )
    expect(markdown).toBe('![demo](./note.assets/demo-1.png)')
  })
})

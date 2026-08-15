import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNoteStore } from '../../../src/stores/note'
import { useEditorTabsStore } from '../../../src/stores/editorTabs'
import { useImportMarkdown } from '../../../src/composables/useImportMarkdown'

describe('useImportMarkdown', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('uTools 选中文件后导入并打开 Tab', async () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const { importMarkdownToActiveFolder } = useImportMarkdown()

    const ok = await importMarkdownToActiveFolder()

    expect(ok).toBe(true)
    expect(noteStore.noteList).toHaveLength(1)
    expect(tabsStore.tabs).toHaveLength(1)
    expect(window.markflow.showNotification).toHaveBeenCalledWith('导入成功')
  })

  it('取消选择文件时不创建笔记', async () => {
    vi.mocked(window.markflow.openMarkdownFile).mockReturnValueOnce(null)
    const noteStore = useNoteStore()
    const { importMarkdownToActiveFolder } = useImportMarkdown()

    const ok = await importMarkdownToActiveFolder()

    expect(ok).toBe(false)
    expect(noteStore.noteList).toHaveLength(0)
  })
})

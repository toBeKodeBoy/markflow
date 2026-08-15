import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNoteStore } from '../../../src/stores/note'
import { useEditorTabsStore } from '../../../src/stores/editorTabs'

describe('editorTabs bootstrap / empty library', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('空库 bootstrapAfterLoad 不创建欢迎笔记且保持零 Tab', () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    noteStore.loadNoteList()

    tabsStore.bootstrapAfterLoad()

    expect(noteStore.noteList).toHaveLength(0)
    expect(tabsStore.tabs).toHaveLength(0)
    expect(tabsStore.activeTabId).toBeNull()
  })

  it('有笔记且无 Tab 时 bootstrapAfterLoad 打开第一篇', () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const note = noteStore.createNoteWithContent('# 已有笔记\n')
    tabsStore.clearAllTabs()

    tabsStore.bootstrapAfterLoad()

    expect(tabsStore.tabs).toHaveLength(1)
    expect(tabsStore.activeTabId).toBe(note.id)
  })

  it('删除最后打开的笔记且库非空时不新建欢迎稿', () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    noteStore.createNoteWithContent('# 保留\n')
    const closing = noteStore.createNoteWithContent('# 关闭\n')
    tabsStore.openTab(closing.id)
    const countBefore = noteStore.noteList.length

    noteStore.deleteNote(closing.id)

    expect(noteStore.noteList.length).toBe(countBefore - 1)
    expect(noteStore.noteList.some((item) => item.title.includes('欢迎使用 MarkFlow'))).toBe(false)
    expect(tabsStore.tabs).toHaveLength(0)
    expect(tabsStore.activeTabId).toBeNull()
  })

  it('删除库内最后一篇笔记后停在空态，不新建欢迎稿', () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const only = noteStore.createNoteWithContent('# 仅有一篇\n')
    tabsStore.openTab(only.id)

    noteStore.deleteNote(only.id)

    expect(noteStore.noteList).toHaveLength(0)
    expect(tabsStore.tabs).toHaveLength(0)
    expect(tabsStore.activeTabId).toBeNull()
  })
})

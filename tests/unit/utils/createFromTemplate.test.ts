import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNoteStore } from '../../../src/stores/note'
import { useEditorTabsStore } from '../../../src/stores/editorTabs'
import { createNoteFromTemplate } from '../../../src/utils/createFromTemplate'
import { NOTE_TEMPLATES } from '../../../src/constants/noteTemplates'

describe('createNoteFromTemplate', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('按模板标题与正文创建笔记，不打开 Tab', () => {
    const store = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const template = NOTE_TEMPLATES[0]

    const note = createNoteFromTemplate(template.id)

    expect(note).toBeTruthy()
    expect(note?.title).toBe(template.title)
    const content = store.getNoteContentById(note!.id)
    expect(content.length).toBeGreaterThan(180)
    expect(content).toContain('故障排查')
    expect(content).not.toMatch(/\{\{title\}\}/)
    expect(tabsStore.tabs).toHaveLength(0)
  })

  it('未知 id 返回 null', () => {
    expect(createNoteFromTemplate('missing' as 'tech-doc')).toBeNull()
    expect(useNoteStore().noteList).toHaveLength(0)
  })

  it('写入指定文件夹，重名时追加序号', () => {
    const store = useNoteStore()
    const folder = store.createFolder('文档')
    const first = createNoteFromTemplate('tech-doc', folder.id)
    const second = createNoteFromTemplate('tech-doc', folder.id)

    expect(first?.folderId).toBe(folder.id)
    expect(second?.folderId).toBe(folder.id)
    expect(first?.title).toBe('技术开发文档')
    expect(second?.title).toBe('技术开发文档 (2)')
  })
})

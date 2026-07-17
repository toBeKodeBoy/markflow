import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNoteStore } from '../../../src/stores/note'

describe('useNoteStore imported source metadata', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('创建导入笔记时应保留源文件绝对路径', () => {
    const store = useNoteStore()

    const note = store.createNoteWithContent('# Imported\nbody', {
      sourceFilePath: 'D:\\docs\\imported.md',
    })

    expect(note.sourceFilePath).toBe('D:\\docs\\imported.md')
    expect(store.currentNote?.sourceFilePath).toBe('D:\\docs\\imported.md')
  })
})

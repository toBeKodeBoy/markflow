/**
 * 集成测试 — 验证笔记 CRUD 全生命周期和视图模式切换
 * @file tests/integration/note-crud.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNoteStore } from '../../src/stores/note'

describe('笔记 CRUD 集成', () => {
  let store: ReturnType<typeof useNoteStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    store = useNoteStore()
  })

  it('完整的笔记生命周期：创建 → 编辑 → 改名 → 删除', () => {
    // 1. 创建
    const note = store.createNoteWithContent('# 我的文章\n\n正文内容')
    expect(note.title).toBe('我的文章')
    expect(store.noteList).toHaveLength(1)

    // 2. 编辑
    store.updateCurrentContent('# 我的文章\n\n更新后的正文')
    expect(store.currentNote!.content).toBe('# 我的文章\n\n更新后的正文')
    expect(store.liveContent).toBe('# 我的文章\n\n更新后的正文')

    // 3. 重命名
    store.renameNote(note.id, '新标题')
    expect(store.currentNote!.title).toBe('新标题')

    // 4. 删除
    store.deleteNote(note.id)
    expect(store.noteList).toHaveLength(0)
    expect(store.currentNote).toBeNull()
    expect(store.liveContent).toBe('')
  })

  it('多笔记切换应保持各自内容', () => {
    const n1 = store.createNoteWithContent('# 笔记一')
    const n2 = store.createNoteWithContent('# 笔记二')
    const n3 = store.createNoteWithContent('# 笔记三')

    // 当前是 n3
    expect(store.currentNote!.title).toBe('笔记三')

    store.openNote(n1.id)
    expect(store.currentNote!.title).toBe('笔记一')

    store.openNote(n2.id)
    expect(store.currentNote!.title).toBe('笔记二')
  })

  it('结合文件夹过滤和搜索', () => {
    const f1 = store.createFolder('工作')
    const f2 = store.createFolder('个人')

    store.createNoteWithContent('# 工作日报', f1.id)
    store.createNoteWithContent('# 项目计划', f1.id)
    store.createNoteWithContent('# 个人日记', f2.id)

    // 按文件夹过滤
    store.activeFolderId = f1.id
    expect(store.filteredNoteList).toHaveLength(2)

    // 同时搜索
    store.searchQuery = '日报'
    expect(store.filteredNoteList).toHaveLength(1)
    expect(store.filteredNoteList[0].title).toBe('工作日报')

    // 清除搜索
    store.searchQuery = ''
    expect(store.filteredNoteList).toHaveLength(2)
  })

  it('大文件策略标记', () => {
    store.createNoteWithContent('x'.repeat(200_001))
    expect(store.pendingLargeFileSwitch).toBe(true)
    store.clearPendingLargeFileSwitch()
    expect(store.pendingLargeFileSwitch).toBe(false)
  })

  it('从内容提取标题：扫描前 50 行', () => {
    // 前 50 行无标题
    const lines = Array.from({ length: 50 }, (_, i) => `第${i + 1}行`)
    const noHeading = lines.join('\n')
    store.createNoteWithContent(noHeading)
    // 无 # 标题时取第一个非空行前 30 字符
    expect(store.currentNote!.title).toBe('第1行')

    // 标题在最后一行（第51行 > TITLE_SCAN_LINES）
    const content = lines.join('\n') + '\n# 第51行标题'
    const note2 = store.createNoteWithContent(content)
    expect(note2.title).toBe('第1行') // 未超出扫描范围，取第一行
  })
})

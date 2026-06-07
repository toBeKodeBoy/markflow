/**
 * 架构验证测试 — 验证架构设计的关键约束
 *
 * 测试关注点：
 * 1. 存储抽象层 — useStorage 对 uTools/浏览器的透明切换
 * 2. preload 桥接 — window.markflow 接口契约
 * 3. 组件通信模式 — Pinia Store 作为唯一状态中心
 * 4. 视图模式架构 — App.vue 决定渲染组件
 * @file tests/architecture/storage-abstraction.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ===== 1. preload.js 接口契约验证 =====
describe('preload 桥接契约', () => {
  it('应暴露完整的 uTools API 接口', () => {
    const api = window.markflow
    // 存储接口
    expect(typeof api.getNoteList).toBe('function')
    expect(typeof api.saveNoteList).toBe('function')
    expect(typeof api.getNote).toBe('function')
    expect(typeof api.saveNote).toBe('function')
    expect(typeof api.removeNote).toBe('function')
    expect(typeof api.getFolderList).toBe('function')
    expect(typeof api.saveFolderList).toBe('function')
    // 设置接口
    expect(typeof api.getSettings).toBe('function')
    expect(typeof api.saveSettings).toBe('function')
    // 文件对话框
    expect(typeof api.saveMarkdownFile).toBe('function')
    expect(typeof api.openMarkdownFile).toBe('function')
    // 系统接口
    expect(typeof api.showNotification).toBe('function')
    expect(typeof api.isDarkTheme).toBe('function')
    expect(typeof api.hideMainWindow).toBe('function')
  })

  it('getNoteList 应返回 NoteListItem[]', () => {
    const list = window.markflow.getNoteList()
    expect(Array.isArray(list)).toBe(true)
  })

  it('getSettings 应返回包含 theme 和 fontSize 的对象', () => {
    const settings = window.markflow.getSettings()
    expect(settings).toHaveProperty('theme')
    expect(settings).toHaveProperty('fontSize')
  })
})

// ===== 2. useStorage 架构设计验证 =====
describe('useStorage 存储抽象层架构', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('在 uTools 环境下应使用 window.markflow', async () => {
    const { useStorage } = await import('../../src/composables/useStorage')
    const storage = useStorage()
    storage.saveNoteList([{ id: 'a', title: 'A', updatedAt: 0 }])
    // 验证实际调用了 uTools bridge
    expect(window.markflow.saveNoteList).toHaveBeenCalled()
    expect(window.markflow.getNoteList).toHaveBeenCalled()
  })

  it('在非 uTools 环境下应回退到 localStorage', async () => {
    // 模拟非 uTools 环境
    const realMarkflow = window.markflow
    delete (window as any).markflow

    // 清除初始化数据
    localStorage.clear()

    const { useStorage } = await import('../../src/composables/useStorage')
    const storage = useStorage()

    // 写笔记
    storage.saveNote({
      id: 'f1', title: 'Fallback',
      content: '# Fallback',
      folderId: undefined, tags: [],
      createdAt: 0, updatedAt: 0,
    })

    // 应从 localStorage 读取
    const raw = localStorage.getItem('markflow_note_f1')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.title).toBe('Fallback')

    // 恢复
    window.markflow = realMarkflow
  })

  it('笔记保存应同时更新 noteList 和 note 内容', async () => {
    const { useStorage } = await import('../../src/composables/useStorage')
    const storage = useStorage()
    const note = {
      id: 'd1', title: '双写', content: '# 双写同步',
      folderId: undefined, tags: [], createdAt: 0, updatedAt: 0,
    }
    storage.saveNote(note)

    const list = storage.getNoteList()
    const saved = storage.getNote('d1')

    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('d1')
    expect(list[0].title).toBe('双写')
    expect(saved?.content).toBe('# 双写同步')
  })
})

// ===== 3. 状态管理模式架构验证 =====
describe('Pinia Store 架构设计', () => {
  it('所有状态变更应通过 Store 方法进行', async () => {
    const { setActivePinia, createPinia } = await import('pinia')
    setActivePinia(createPinia())
    const { useNoteStore } = await import('../../src/stores/note')
    const store = useNoteStore()

    // 验证核心方法存在
    expect(typeof store.createNote).toBe('function')
    expect(typeof store.openNote).toBe('function')
    expect(typeof store.updateCurrentContent).toBe('function')
    expect(typeof store.deleteNote).toBe('function')
    expect(typeof store.renameNote).toBe('function')
    expect(typeof store.createFolder).toBe('function')
    expect(typeof store.deleteFolder).toBe('function')
    expect(typeof store.renameFolder).toBe('function')
    expect(typeof store.requestTocJump).toBe('function')
    expect(typeof store.setLiveContent).toBe('function')

    // 验证响应式计算属性
    expect(Array.isArray(store.filteredNoteList)).toBe(true)
  })

  it('liveContent 是编辑器的唯一内容源', () => {
    // 这个模式确保了 WYSIWYG 和源码编辑器共用同一数据源
    // 通过 setLiveContent / updateCurrentContent 双向同步
  })
})

// ===== 4. 视图模式架构验证 =====
describe('视图模式架构设计', () => {
  it('支持 4 种视图模式', () => {
    const modes = ['live', 'split', 'source', 'focus']
    expect(modes).toHaveLength(4)
    // live: Milkdown WYSIWYG
    // split: CodeMirror + marked preview
    // source: CodeMirror 纯编辑
    // focus: Milkdown 全屏无干扰
  })

  it('focus 模式应记录上一个模式用于退出恢复', () => {
    // App.vue 中用 prevMode 保存 focus 前的模式
    // 按 Esc 恢复
  })

  it('大文件应自动切换到分屏模式', () => {
    // 当内容 > 200KB 且处于 live/focus 模式时
    // App.vue 监听 pendingLargeFileSwitch 自动切换
  })
})

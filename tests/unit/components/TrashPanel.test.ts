import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import TrashPanel from '../../../src/components/TRashPanel.vue'
import { useNoteStore } from '../../../src/stores/note'

let pinia: Pinia

function mountPanel(props: Record<string, unknown> = {}) {
  return mount(TrashPanel, {
    props: { visible: true, ...props },
    global: {
      plugins: [pinia],
      stubs: {
        Teleport: true,
        AppIcon: true,
      },
    },
  })
}

describe('TrashPanel', () => {
  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    // 组件内部调用 confirm 确认危险操作，测试环境统一放行
    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('渲染笔记回收站条目（标题、删除时间）', async () => {
    const store = useNoteStore()
    store.loadNoteList()
    const note = store.createNoteWithContent('# 待删除笔记\n')
    store.softDeleteNote(note.id)

    const wrapper = mountPanel()
    await flushPromises()

    const items = wrapper.findAll('.trash-item')
    expect(items).toHaveLength(1)
    expect(items[0].text()).toContain('待删除笔记')
    const time = items[0].find('.trash-time')
    expect(time.exists()).toBe(true)
    expect(time.text().trim().length).toBeGreaterThan(0)
  })

  it('渲染文件夹回收站条目（名称与子内容统计）', async () => {
    const store = useNoteStore()
    store.loadNoteList()
    const folder = store.createFolder('项目文件夹')
    const sub = store.createFolder('子文件夹', folder.id)
    store.createNoteWithContent('# 笔记A\n', { folderId: sub.id })
    store.softDeleteFolder(folder.id)

    const wrapper = mountPanel()
    await flushPromises()

    const folderItem = wrapper.find('.trash-folder-item')
    expect(folderItem.exists()).toBe(true)
    expect(folderItem.text()).toContain('项目文件夹')
    expect(folderItem.text()).toContain('1 个子文件夹')
    expect(folderItem.text()).toContain('1 篇笔记')
  })

  it('点击「恢复」按钮触发 restore-note emit', async () => {
    const store = useNoteStore()
    store.loadNoteList()
    const note = store.createNoteWithContent('# 可恢复笔记\n')
    store.softDeleteNote(note.id)

    const wrapper = mountPanel()
    await flushPromises()

    await wrapper.find('.btn-restore').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('restore-note')).toBeTruthy()
    expect(wrapper.emitted('restore-note')![0]).toEqual([note.id])
  })

  it('点击「彻底删除」按钮触发 permanent-delete-note emit', async () => {
    const store = useNoteStore()
    store.loadNoteList()
    const note = store.createNoteWithContent('# 待永久删除\n')
    store.softDeleteNote(note.id)

    const wrapper = mountPanel()
    await flushPromises()

    await wrapper.find('.btn-delete').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('permanent-delete-note')).toBeTruthy()
    expect(wrapper.emitted('permanent-delete-note')![0]).toEqual([note.id])
  })

  it('有条目时「清空」按钮存在', async () => {
    const store = useNoteStore()
    store.loadNoteList()
    const note = store.createNoteWithContent('# 任意笔记\n')
    store.softDeleteNote(note.id)

    const wrapper = mountPanel()
    await flushPromises()

    const clearBtn = wrapper.find('.trash-clear-btn')
    expect(clearBtn.exists()).toBe(true)
    expect(clearBtn.text()).toContain('清空')
  })

  it('回收站为空时显示空状态且不显示清空按钮', async () => {
    const store = useNoteStore()
    store.loadNoteList()

    const wrapper = mountPanel()
    await flushPromises()

    expect(wrapper.find('.trash-empty').exists()).toBe(true)
    expect(wrapper.find('.trash-clear-btn').exists()).toBe(false)
  })
})

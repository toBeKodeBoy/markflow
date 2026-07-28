import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Sidebar from '../../../src/components/Sidebar.vue'
import { useNoteStore } from '../../../src/stores/note'

let pinia: Pinia
let styleEl: HTMLStyleElement | null = null
const root = resolve(import.meta.dirname, '../../..')
const appStyles = readFileSync(resolve(root, 'src/style.css'), 'utf8')

function mountSidebar() {
  return mount(Sidebar, {
    global: {
      plugins: [pinia],
      stubs: {
        Teleport: true,
        AppIcon: true,
        CreateEntryModal: {
          props: ['visible'],
          template: '<div v-if="visible">新建内容</div>',
        },
        SidebarTreeRowView: {
          props: ['row'],
          template: `
            <div class="sidebar-row-stub">
              {{ row.kind === 'folder' ? row.folder.name : row.note.title }}
              <button
                v-if="row.kind === 'folder'"
                class="folder-context-trigger"
                @click="$emit('folder-context', { clientX: 12, clientY: 34 }, row.folder.id)"
              >
                folder-menu
              </button>
              <button
                v-else
                class="note-context-trigger"
                @click="$emit('note-context', { clientX: 56, clientY: 78 }, row.note.id)"
              >
                note-menu
              </button>
            </div>
          `,
        },
      },
    },
  })
}

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    pinia = createPinia()
    setActivePinia(pinia)
    styleEl = document.createElement('style')
    styleEl.textContent = appStyles
    document.head.appendChild(styleEl)
  })

  afterEach(() => {
    styleEl?.remove()
    styleEl = null
  })

  it('removes redundant sidebar section headers and inline create hint', async () => {
    const store = useNoteStore()
    const folder = store.createFolder('项目文档')
    store.createNoteWithContent('# 根笔记\n')
    store.activeFolderId = folder.id
    store.createNoteWithContent('# 测试笔记\n', { folderId: folder.id })

    const wrapper = mountSidebar()
    await flushPromises()

    expect(wrapper.text()).not.toContain('全部笔记')
    expect(wrapper.text()).not.toContain('文件夹')
    expect(wrapper.text()).not.toContain('在此新建')
    expect(wrapper.text()).toContain('项目文档')
    expect(wrapper.text()).toContain('根笔记')
  })

  it('provides a lightweight way to clear the active folder filter', async () => {
    const store = useNoteStore()
    const folder = store.createFolder('项目文档')
    store.createNoteWithContent('# 根笔记\n')
    store.activeFolderId = folder.id
    store.createNoteWithContent('# 文件夹笔记\n', { folderId: folder.id })

    const wrapper = mountSidebar()
    await flushPromises()

    const clearButton = wrapper.get('[data-testid="sidebar-clear-folder-filter"]')
    await clearButton.trigger('click')
    await flushPromises()

    expect(store.activeFolderId).toBe(null)
    expect(wrapper.text()).toContain('根笔记')
    expect(wrapper.find('[data-testid="sidebar-clear-folder-filter"]').exists()).toBe(false)
  })

  it('keeps empty state guidance pointing to the topbar create action', async () => {
    const wrapper = mountSidebar()
    await flushPromises()

    expect(wrapper.text()).toContain('暂无笔记')
    expect(wrapper.text()).toContain('新建')
  })

  it('renders context menu labels for notes and folders', async () => {
    const store = useNoteStore()
    const folder = store.createFolder('工作区')
    store.createNoteWithContent('# 周报\n')
    store.createNoteWithContent('# 文件夹笔记\n', { folderId: folder.id })

    const wrapper = mountSidebar()
    await flushPromises()

    await wrapper.get('.note-context-trigger').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('置顶')
    expect(wrapper.text()).toContain('删除')

    await wrapper.get('.folder-context-trigger').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('新建子文件夹')
    expect(wrapper.text()).toContain('新建笔记')
  })

  it('renders note context menu without fixed right anchoring', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# A\n')

    const wrapper = mountSidebar()
    await flushPromises()
    await wrapper.get('.note-context-trigger').trigger('click')
    await flushPromises()

    const menu = wrapper.get('.context-menu-fixed').element as HTMLElement
    expect(menu.className).toContain('context-menu-fixed')
    expect(getComputedStyle(menu).right).toBe('auto')
  })

  it('search expansion does not persist expanded folder state', async () => {
    const store = useNoteStore()
    const folder = store.createFolder('docs')
    store.createNoteWithContent('# Match\nbody', { folderId: folder.id })

    const saveSpy = vi.spyOn(window.markflow, 'saveSettings')
    const wrapper = mountSidebar()
    await flushPromises()
    saveSpy.mockClear()

    store.searchQuery = 'match'
    await flushPromises()

    expect(saveSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ sidebarExpandedFolderIds: expect.any(Array) })
    )

    await wrapper.unmount()
  })
})

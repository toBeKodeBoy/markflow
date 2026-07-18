import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import Sidebar from '../../../src/components/Sidebar.vue'
import { useNoteStore } from '../../../src/stores/note'

let pinia: Pinia

function mountSidebar() {
  return mount(Sidebar, {
    global: {
      plugins: [pinia],
      stubs: {
        Teleport: true,
        AppIcon: true,
        SearchBar: {
          template: '<div class="search-bar-stub"></div>',
          methods: {
            clearSearch() {},
          },
        },
        SearchResultsList: {
          template: '<div class="search-results-list-stub"></div>',
        },
        TagCloudPanel: {
          template: '<div class="tag-cloud-panel-stub"></div>',
        },
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
    expect(clearButton.text()).toContain('返回全部')

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

  it('renders readable tag filter and context menu labels', async () => {
    const store = useNoteStore()
    const folder = store.createFolder('工作区')
    const note = store.createNoteWithContent('# 周报\n')
    store.setNoteTags(note.id, ['自定义标签'])
    store.createNoteWithContent('# 文件夹笔记\n', { folderId: folder.id })

    const wrapper = mountSidebar()
    await flushPromises()

    expect(wrapper.text()).toContain('全部')
    expect(wrapper.text()).toContain('自定义标签')

    await wrapper.get('.note-context-trigger').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('置顶')
    expect(wrapper.text()).toContain('删除')

    await wrapper.get('.folder-context-trigger').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('新建子文件夹')
    expect(wrapper.text()).toContain('新建笔记')
  })
})

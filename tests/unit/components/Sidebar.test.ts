import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Sidebar from '../../../src/components/Sidebar.vue'
import { useNoteStore } from '../../../src/stores/note'
import { useEditorTabsStore } from '../../../src/stores/editorTabs'
import { useWorkspaceStore } from '../../../src/stores/workspace'
import { RECENT_FOLDER_ID } from '../../../src/constants/recentFolder'
import { useAppSettings } from '../../../src/composables/useAppSettings'

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
            <div
              class="sidebar-row-stub"
              :data-kind="row.kind"
              :data-depth="row.depth"
              :data-my="row.isMyFolder ? '1' : '0'"
              :data-recent="row.isRecentView ? '1' : '0'"
            >
              {{ row.kind === 'folder' ? row.folder.name : row.note.title }}
              <button
                v-if="row.kind === 'folder'"
                class="folder-click-trigger"
                @click="$emit('folder-click', row.folder.id, row.hasChildren)"
              >
                folder-click
              </button>
              <button
                v-if="row.kind === 'folder'"
                class="folder-context-trigger"
                @click="$emit('folder-context', { clientX: 12, clientY: 34 }, row.folder.id)"
              >
                folder-menu
              </button>
              <button
                v-if="row.kind === 'folder' && !row.isSystemFolder"
                class="folder-drag-trigger"
                @click="$emit('drag-start', { kind: 'folder', id: row.folder.id })"
              >
                folder-drag
              </button>
              <button
                v-if="row.kind === 'folder'"
                class="folder-drop-trigger"
                @click="$emit('drop-on-folder', row.folder.id, 'inside')"
              >
                folder-drop
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

/** 按文件夹名定位 stub 行 */
function findFolderRow(wrapper: ReturnType<typeof mountSidebar>, name: string) {
  return wrapper
    .findAll('.sidebar-row-stub')
    .find((row) => row.attributes('data-kind') === 'folder' && row.text().includes(name))
}

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    // settingsRef 为模块级缓存，清空存储后需重载，避免跨用例泄漏
    useAppSettings().load()
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
    expect(wrapper.text()).toContain('我的文件夹')
    expect(wrapper.text()).not.toContain('在此新建')
    expect(wrapper.text()).toContain('项目文档')
    expect(wrapper.text()).toContain('根笔记')
  })

  it('renders shell chrome: logo, create CTA, nav and spaces', async () => {
    const store = useNoteStore()
    store.createFolder('项目文档')
    const wrapper = mountSidebar()
    await flushPromises()

    expect(wrapper.find('[data-testid="sidebar-brand"]').text()).toContain('MarkFlow')
    expect(wrapper.find('[data-testid="sidebar-create-note"]').text()).toContain('新建文档')
    const nav = wrapper.get('[data-testid="sidebar-nav"]')
    expect(nav.text()).toContain('首页')
    expect(nav.text()).toContain('文档')
    expect(nav.text()).toContain('回收站')
    expect(nav.text()).not.toContain('知识库')
    expect(nav.text()).not.toContain('标签')
    expect(wrapper.get('[data-testid="sidebar-spaces"]').text()).toContain('空间')
    expect(wrapper.get('[data-testid="sidebar-space-my"]').text()).toContain('我的空间')
    expect(wrapper.get('[data-testid="sidebar-spaces"]').text()).toContain('项目文档')
    expect(wrapper.find('.sidebar-bottom-bar .trash-btn').exists()).toBe(false)
    expect(wrapper.find('[data-testid="sidebar-settings"]').exists()).toBe(true)
  })

  it('selecting a space filters the tree to that subtree', async () => {
    const store = useNoteStore()
    const spaceA = store.createFolder('空间A')
    const spaceB = store.createFolder('空间B')
    store.createNoteWithContent('# A笔记\n', { folderId: spaceA.id })
    store.createNoteWithContent('# B笔记\n', { folderId: spaceB.id })

    const wrapper = mountSidebar()
    await flushPromises()

    const spaceButtons = wrapper.findAll('[data-testid="sidebar-space-item"]')
    const spaceABtn = spaceButtons.find((btn) => btn.text().includes('空间A'))
    expect(spaceABtn).toBeTruthy()
    await spaceABtn!.trigger('click')
    await flushPromises()

    expect(store.activeFolderId).toBe(spaceA.id)
    expect(wrapper.text()).toContain('A笔记')
    expect(wrapper.text()).not.toContain('B笔记')
  })

  it('selecting 我的空间 clears the space filter and shows all notes', async () => {
    const store = useNoteStore()
    const spaceA = store.createFolder('空间A')
    store.createNoteWithContent('# 根笔记\n')
    store.createNoteWithContent('# A笔记\n', { folderId: spaceA.id })

    const wrapper = mountSidebar()
    await flushPromises()

    const spaceABtn = wrapper
      .findAll('[data-testid="sidebar-space-item"]')
      .find((btn) => btn.text().includes('空间A'))
    await spaceABtn!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).not.toContain('根笔记')

    await wrapper.get('[data-testid="sidebar-space-my"]').trigger('click')
    await flushPromises()

    expect(store.activeFolderId).toBe(null)
    expect(wrapper.text()).toContain('根笔记')
    expect(wrapper.text()).toContain('A笔记')
  })

  it('creating a top-level folder from spaces + selects that space', async () => {
    const store = useNoteStore()
    const other = store.createFolder('其他空间')
    store.createNoteWithContent('# 其他笔记\n', { folderId: other.id })

    const wrapper = mount(Sidebar, {
      global: {
        plugins: [pinia],
        stubs: {
          Teleport: true,
          AppIcon: true,
          SettingsModal: true,
          ImportFolderModal: true,
          SidebarTreeRowView: {
            props: ['row'],
            template: `
              <div class="sidebar-row-stub" :data-kind="row.kind">
                {{ row.kind === 'folder' ? row.folder.name : row.note.title }}
              </div>
            `,
          },
        },
      },
    })
    await flushPromises()

    await wrapper.get('[data-testid="sidebar-space-add"]').trigger('click')
    await flushPromises()
    await wrapper.find('.create-entry-input').setValue('新空间')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    const created = store.folderList.find((folder) => folder.name === '新空间')
    expect(created).toBeTruthy()
    expect(created?.parentId).toBeUndefined()
    expect(store.activeFolderId).toBe(created!.id)
    expect(
      wrapper.findAll('[data-testid="sidebar-space-item"]').find((btn) => btn.text().includes('新空间'))?.classes(),
    ).toContain('active')
    expect(wrapper.findAll('.sidebar-row-stub').some((row) => row.text().includes('其他笔记'))).toBe(false)
  })

  it('spaces + opens the create modal without writing a folder', async () => {
    const store = useNoteStore()
    const folderCountBefore = store.folderList.length
    const wrapper = mountSidebar()
    await flushPromises()

    await wrapper.get('[data-testid="sidebar-space-add"]').trigger('click')
    await flushPromises()

    expect(store.folderList.length).toBe(folderCountBefore)
    expect(wrapper.text()).toContain('新建内容')
  })

  it('trash nav opens the existing trash panel and keeps the badge', async () => {
    const store = useNoteStore()
    const note = store.createNoteWithContent('# 待删笔记\n')
    const folder = store.createFolder('待删文件夹')
    store.softDeleteNote(note.id)
    store.softDeleteFolder(folder.id)

    const wrapper = mountSidebar()
    await flushPromises()

    const badge = wrapper.find('.trash-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('2')

    await wrapper.get('[data-testid="sidebar-nav-trash"]').trigger('click')
    await flushPromises()
    expect(useWorkspaceStore().view).toBe('trash')
    expect(wrapper.find('.trash-panel-modal, .trash-overlay').exists()).toBe(false)
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

    await findFolderRow(wrapper, '工作区')!.find('.folder-context-trigger').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('新建子文件夹')
    expect(wrapper.text()).toContain('新建笔记')
  })

  it('renders new context menu items for notes and folders', async () => {
    const store = useNoteStore()
    const folder = store.createFolder('工作区')
    store.createNoteWithContent('# 周报\n')
    store.createNoteWithContent('# 文件夹笔记\n', { folderId: folder.id })

    const wrapper = mountSidebar()
    await flushPromises()

    // 笔记右键菜单新增「复制」和「定位文件夹」
    await wrapper.get('.note-context-trigger').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('复制')
    expect(wrapper.text()).toContain('定位文件夹')

    // 文件夹右键菜单新增「置顶」，删除改为「移入回收站」
    await findFolderRow(wrapper, '工作区')!.find('.folder-context-trigger').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('置顶')
    expect(wrapper.text()).toContain('移入回收站')
    expect(wrapper.text()).not.toContain('删除')
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

  it('renders the recent virtual folder at the top of the sidebar tree', async () => {
    const store = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const note = store.createNoteWithContent('# Recent note\n')
    tabsStore.openTab(note.id)

    const wrapper = mountSidebar()
    await flushPromises()

    const rows = wrapper.findAll('.sidebar-row-stub')
    expect(rows[0].text()).toContain('最新')
    expect(rows.some((row) => row.text().includes('Recent note'))).toBe(true)
  })

  it('clicking the recent folder does not change activeFolderId', async () => {
    const store = useNoteStore()
    const folder = store.createFolder('工作区')
    store.activeFolderId = folder.id
    store.createNoteWithContent('# Recent\n')

    const wrapper = mountSidebar()
    await flushPromises()

    const recentTrigger = wrapper.find('.folder-click-trigger')
    await recentTrigger.trigger('click')
    await flushPromises()

    expect(store.activeFolderId).toBe(folder.id)
  })

  it('filters recent notes when searching', async () => {
    const store = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const alpha = store.createNoteWithContent('# Alpha\n')
    const beta = store.createNoteWithContent('# Beta\n')
    tabsStore.openTab(alpha.id)
    tabsStore.openTab(beta.id)

    const wrapper = mountSidebar()
    await flushPromises()

    store.searchQuery = 'beta'
    await flushPromises()

    const recentRows = wrapper
      .findAll('.sidebar-row-stub')
      .filter((row) => row.attributes('data-recent') === '1')
    expect(recentRows).toHaveLength(1)
    expect(recentRows[0].text()).toContain('Beta')
  })

  it('expand button cycles through collapse / level 1 / level 2 / all', async () => {
    const store = useNoteStore()
    const a = store.createFolder('一级文件夹')
    const b = store.createFolder('二级文件夹', a.id)
    const c = store.createFolder('三级文件夹', b.id)
    store.createNoteWithContent('# 深层笔记\n', { folderId: c.id })

    const wrapper = mountSidebar()
    await flushPromises()

    const folderRows = () =>
      wrapper
        .findAll('.sidebar-row-stub')
        .filter((row) => row.attributes('data-kind') === 'folder')
        .map((row) => row.text())
    const noteVisible = () => wrapper.text().includes('深层笔记')

    // 先点「折叠」全部收起
    await wrapper.findAll('.sidebar-toolbar-btn')[0].trigger('click')
    await flushPromises()
    expect(folderRows().some((t) => t.includes('二级文件夹'))).toBe(false)

    const expandBtn = wrapper.findAll('.sidebar-toolbar-btn')[1]
    expect(expandBtn.text()).toContain('展开1级')

    // 第 1 次：展开 1 级
    await expandBtn.trigger('click')
    await flushPromises()
    expect(folderRows().some((t) => t.includes('二级文件夹'))).toBe(true)
    expect(folderRows().some((t) => t.includes('三级文件夹'))).toBe(false)
    expect(expandBtn.text()).toContain('展开2级')

    // 第 2 次：展开 2 级
    await expandBtn.trigger('click')
    await flushPromises()
    expect(folderRows().some((t) => t.includes('三级文件夹'))).toBe(true)
    expect(noteVisible()).toBe(false)
    expect(expandBtn.text()).toContain('展开全部')

    // 第 3 次：展开全部（含叶子内的笔记）
    await expandBtn.trigger('click')
    await flushPromises()
    expect(noteVisible()).toBe(true)
    expect(expandBtn.text()).toContain('折叠全部')

    // 第 4 次：回到折叠全部
    await expandBtn.trigger('click')
    await flushPromises()
    expect(noteVisible()).toBe(false)
    expect(folderRows().some((t) => t.includes('二级文件夹'))).toBe(false)
    expect(expandBtn.text()).toContain('展开1级')
  })

  it('trash badge counts both trashed notes and folders', async () => {
    const store = useNoteStore()
    const note = store.createNoteWithContent('# 待删笔记\n')
    const folder = store.createFolder('待删文件夹')
    store.softDeleteNote(note.id)
    store.softDeleteFolder(folder.id)

    const wrapper = mountSidebar()
    await flushPromises()

    const badge = wrapper.find('.trash-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('2')
  })

  it('collapsing the recent folder should persist after remount', async () => {
    const store = useNoteStore()
    const tabsStore = useEditorTabsStore()

    const note = store.createNoteWithContent('# Recent note\n')
    tabsStore.openTab(note.id)

    const wrapper = mountSidebar()
    await flushPromises()

    // Collapse the only folder row ("最新")
    const recentFolderRow = wrapper
      .findAll('.sidebar-row-stub')
      .find((row) => row.attributes('data-kind') === 'folder' && row.text().includes('最新'))
    expect(recentFolderRow).toBeTruthy()

    const toggleBtn = recentFolderRow!.find('.folder-click-trigger')
    await toggleBtn.trigger('click')
    await flushPromises()

    const recentNoteRowsAfterCollapse = wrapper
      .findAll('.sidebar-row-stub')
      .filter((row) => row.attributes('data-recent') === '1')
    expect(recentNoteRowsAfterCollapse).toHaveLength(0)

    await wrapper.unmount()

    const wrapper2 = mountSidebar()
    await flushPromises()

    const recentNoteRowsAfterRemount = wrapper2
      .findAll('.sidebar-row-stub')
      .filter((row) => row.attributes('data-recent') === '1')
    // If collapse persisted, recent notes should not render.
    expect(recentNoteRowsAfterRemount).toHaveLength(0)
  })

  // ===== 「我的文件夹」虚拟容器 =====
  it('renders my-folder container after recent and wraps real content with depth +1', async () => {
    const store = useNoteStore()
    const folder = store.createFolder('工作区')
    store.createNoteWithContent('# 根笔记\n')
    store.createNoteWithContent('# 文件夹笔记\n', { folderId: folder.id })

    const wrapper = mountSidebar()
    await flushPromises()

    const rows = wrapper.findAll('.sidebar-row-stub')
    expect(rows[0].text()).toContain('最新')
    expect(rows[1].text()).toContain('我的文件夹')
    expect(rows[1].attributes('data-my')).toBe('1')

    // 真实文件夹与根笔记都成为容器子行，深度 +1
    const folderRow = rows.find((r) => r.text().includes('工作区'))!
    expect(folderRow.attributes('data-depth')).toBe('1')
    const rootNoteRow = rows.find((r) => r.text().includes('根笔记'))!
    expect(rootNoteRow.attributes('data-depth')).toBe('1')
  })

  it('clicking my-folder container does not change activeFolderId', async () => {
    const store = useNoteStore()
    const folder = store.createFolder('工作区')
    store.activeFolderId = folder.id
    store.createNoteWithContent('# 笔记\n')

    const wrapper = mountSidebar()
    await flushPromises()

    await findFolderRow(wrapper, '我的文件夹')!.find('.folder-click-trigger').trigger('click')
    await flushPromises()

    expect(store.activeFolderId).toBe(folder.id)
  })

  it('right-clicking my-folder container does not open context menu', async () => {
    const store = useNoteStore()
    store.createFolder('工作区')

    const wrapper = mountSidebar()
    await flushPromises()

    await findFolderRow(wrapper, '我的文件夹')!.find('.folder-context-trigger').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.context-menu')).toHaveLength(0)
  })

  it('collapsing my-folder hides real folders and persists after remount', async () => {
    const store = useNoteStore()
    const folder = store.createFolder('工作区')
    // 不打开标签页，避免笔记进入「最新」视图干扰折叠断言
    store.createNoteWithContent('# 根笔记\n')

    const wrapper = mountSidebar()
    await flushPromises()

    await findFolderRow(wrapper, '我的文件夹')!.find('.folder-click-trigger').trigger('click')
    await flushPromises()

    // 折叠后真实文件夹与根笔记从树中隐藏；空间列表仍可显示顶层名
    const treeText = wrapper.findAll('.sidebar-row-stub').map((row) => row.text()).join('\n')
    expect(treeText).not.toContain('工作区')
    expect(treeText).not.toContain('根笔记')
    expect(treeText).toContain('最新')

    await wrapper.unmount()

    const wrapper2 = mountSidebar()
    await flushPromises()
    const remountTreeText = wrapper2.findAll('.sidebar-row-stub').map((row) => row.text()).join('\n')
    expect(remountTreeText).not.toContain('工作区')
  })

  it('expands my-folder once for legacy users whose saved state lacks the container id', async () => {
    const store = useNoteStore()
    store.createFolder('工作区')
    // 模拟老用户：已持久化展开状态但不含新容器 ID，也无迁移标记
    window.markflow.saveSettings({ sidebarExpandedFolderIds: [RECENT_FOLDER_ID] })
    useAppSettings().load()

    const wrapper = mountSidebar()
    await flushPromises()

    // 一次性迁移：容器被展开，资料库可见
    expect(wrapper.text()).toContain('工作区')
    expect((window.markflow.getSettings() as { myFolderIntroMigrated?: boolean }).myFolderIntroMigrated).toBe(true)

    // 迁移后用户手动折叠的意图应被保留
    await findFolderRow(wrapper, '我的文件夹')!.find('.folder-click-trigger').trigger('click')
    await flushPromises()
    await wrapper.unmount()

    const wrapper2 = mountSidebar()
    await flushPromises()
    const remountTreeText = wrapper2.findAll('.sidebar-row-stub').map((row) => row.text()).join('\n')
    expect(remountTreeText).not.toContain('工作区')
  })

  it('dropping a folder onto my-folder container moves it to root', async () => {
    const store = useNoteStore()
    const parent = store.createFolder('工作区')
    const child = store.createFolder('子文件夹', parent.id)

    const wrapper = mountSidebar()
    await flushPromises()

    // 首次启动默认展开含子项的一级文件夹，「子文件夹」行可见
    await findFolderRow(wrapper, '子文件夹')!.find('.folder-drag-trigger').trigger('click')
    await findFolderRow(wrapper, '我的文件夹')!.find('.folder-drop-trigger').trigger('click')
    await flushPromises()

    expect(store.folderList.find((f) => f.id === child.id)?.parentId).toBeUndefined()
  })
})

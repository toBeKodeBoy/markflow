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
    expect(wrapper.text()).not.toContain('我的文件夹')
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
    expect(wrapper.find('[data-testid="sidebar-settings"]').text()).toContain('设置')
    expect(wrapper.find('[data-testid="sidebar-help"]').text()).toContain('帮助与反馈')
    expect(wrapper.find('[data-testid="sidebar-create-note"]').text()).toContain('新建文档')
    expect(wrapper.find('[data-testid="sidebar-logo"] .logo-mark').exists()).toBe(true)
    expect(wrapper.find('[data-testid="sidebar-storage-caption"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('数据：uTools 本地数据库')
  })

  it('点击帮助与反馈应打开教程笔记', async () => {
    const wrapper = mountSidebar()
    const tabsStore = useEditorTabsStore()
    expect(tabsStore.tabs).toHaveLength(0)

    await wrapper.get('[data-testid="sidebar-help"]').trigger('click')
    await flushPromises()

    expect(tabsStore.tabs.length).toBeGreaterThan(0)
  })

  it('selecting a space expands its body and shows its subtree', async () => {
    const store = useNoteStore()
    const spaceA = store.createFolder('空间A')
    const child = store.createFolder('子目录', spaceA.id)
    store.createNoteWithContent('# A笔记\n', { folderId: spaceA.id })
    store.createNoteWithContent('# 子笔记\n', { folderId: child.id })
    store.createNoteWithContent('# B笔记\n')

    const wrapper = mountSidebar()
    await flushPromises()

    expect(wrapper.find(`[data-testid="sidebar-space-toggle-${spaceA.id}"]`).exists()).toBe(true)
    await wrapper.get(`[data-testid="sidebar-space-item-${spaceA.id}"]`).trigger('click')
    await flushPromises()

    expect(store.activeFolderId).toBe(spaceA.id)
    const spaceBody = wrapper.get(`[data-testid="sidebar-space-body-${spaceA.id}"]`)
    expect(spaceBody.text()).toContain('A笔记')
    expect(spaceBody.text()).toContain('子目录')
    await findFolderRow(wrapper, '子目录')!.find('.folder-click-trigger').trigger('click')
    await flushPromises()
    expect(wrapper.get(`[data-testid="sidebar-space-body-${spaceA.id}"]`).text()).toContain('子笔记')
    expect(wrapper.get('[data-testid="sidebar-space-body-my"]').text()).toContain('B笔记')
  })

  it('selecting 我的空间 shows root notes again', async () => {
    const store = useNoteStore()
    const spaceA = store.createFolder('空间A')
    store.createNoteWithContent('# 根笔记\n')
    store.createNoteWithContent('# A笔记\n', { folderId: spaceA.id })

    const wrapper = mountSidebar()
    await flushPromises()

    await wrapper.get('[data-testid="sidebar-space-item-' + spaceA.id + '"]').trigger('click')
    await flushPromises()
    expect(wrapper.get(`[data-testid="sidebar-space-body-${spaceA.id}"]`).text()).toContain('A笔记')

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
    expect(wrapper.get(`[data-testid="sidebar-space-item-${created!.id}"]`).element.parentElement?.className).toContain('active')
    expect(wrapper.find(`[data-testid="sidebar-space-body-${created!.id}"]`).exists()).toBe(true)
    expect(wrapper.get(`[data-testid="sidebar-space-body-${other.id}"]`).text()).toContain('其他笔记')
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

    expect(wrapper.text()).toContain('暂无文档')
    expect(wrapper.text()).toContain('新建文档')
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

    await wrapper.get(`[data-testid="sidebar-space-item-${folder.id}"]`).element.parentElement!.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 12, clientY: 34 })
    )
    await flushPromises()
    expect(wrapper.text()).toContain('新建子文件夹')
    expect(wrapper.text()).toContain('新建文档')
    expect(wrapper.text()).not.toContain('新建笔记')
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
    await wrapper.get(`[data-testid="sidebar-space-item-${folder.id}"]`).element.parentElement!.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 12, clientY: 34 })
    )
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

  it('does not render the recent virtual folder but still records access', async () => {
    const store = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const note = store.createNoteWithContent('# Recent note\n')
    tabsStore.openTab(note.id)

    const wrapper = mountSidebar()
    await flushPromises()

    expect(wrapper.text()).not.toContain('最新')
    const recentRows = wrapper
      .findAll('.sidebar-row-stub')
      .filter((row) => row.attributes('data-recent') === '1')
    expect(recentRows).toHaveLength(0)
    expect(wrapper.text()).toContain('Recent note')
    expect(useAppSettings().get().recentNoteAccess?.[0]?.noteId).toBe(note.id)
  })

  it('search does not surface recent-view rows', async () => {
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

    expect(wrapper.text()).not.toContain('最新')
    const recentRows = wrapper
      .findAll('.sidebar-row-stub')
      .filter((row) => row.attributes('data-recent') === '1')
    expect(recentRows).toHaveLength(0)
    expect(wrapper.text()).toContain('Beta')
  })

  it('does not render batch collapse or expand toolbar', async () => {
    const wrapper = mountSidebar()
    await flushPromises()
    expect(wrapper.find('.sidebar-toolbar').exists()).toBe(false)
    expect(wrapper.findAll('.sidebar-toolbar-btn')).toHaveLength(0)
    expect(wrapper.text()).not.toMatch(/展开1级|展开2级|展开全部|折叠全部/)
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

  // ===== 「我的空间」根内容 =====
  it('renders my-space root content directly without my-folder container', async () => {
    const store = useNoteStore()
    const folder = store.createFolder('工作区')
    store.createNoteWithContent('# 根笔记\n')
    store.createNoteWithContent('# 文件夹笔记\n', { folderId: folder.id })

    const wrapper = mountSidebar()
    await flushPromises()

    const rows = wrapper.findAll('.sidebar-row-stub')
    expect(rows.some((row) => row.text().includes('我的文件夹'))).toBe(false)
    expect(rows.some((row) => row.attributes('data-my') === '1')).toBe(false)
    expect(wrapper.text()).not.toContain('最新')

    // 根笔记直接挂在「我的空间」下，顶层文件夹由空间列表承载，避免重复渲染
    const rootNoteRow = rows.find((r) => r.text().includes('根笔记'))!
    expect(rootNoteRow.attributes('data-depth')).toBe('0')
    expect(wrapper.get(`[data-testid="sidebar-space-item-${folder.id}"]`).text()).toContain('工作区')
  })

  it('collapsing my-space hides root notes without rendering my-folder container', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# 笔记\n')

    const wrapper = mountSidebar()
    await flushPromises()
    expect(wrapper.text()).toContain('笔记')

    await wrapper.get('[data-testid="sidebar-space-my-toggle"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('笔记')
    expect(wrapper.text()).not.toContain('我的文件夹')
  })

  it('toggling a space body persists after remount', async () => {
    const store = useNoteStore()
    const spaceA = store.createFolder('空间A')
    store.createNoteWithContent('# A笔记\n', { folderId: spaceA.id })

    const wrapper = mountSidebar()
    await flushPromises()

    expect(wrapper.find(`[data-testid="sidebar-space-body-${spaceA.id}"]`).exists()).toBe(true)

    await wrapper.get(`[data-testid="sidebar-space-toggle-${spaceA.id}"]`).trigger('click')
    await flushPromises()
    expect(wrapper.find(`[data-testid="sidebar-space-body-${spaceA.id}"]`).exists()).toBe(false)

    await wrapper.unmount()

    const wrapper2 = mountSidebar()
    await flushPromises()
    expect(wrapper2.find(`[data-testid="sidebar-space-body-${spaceA.id}"]`).exists()).toBe(false)
  })

  it('expands my-space once for legacy users whose saved state lacks the root id', async () => {
    const store = useNoteStore()
    store.createFolder('工作区')
    // 模拟老用户：已持久化展开状态但不含新容器 ID，也无迁移标记
    window.markflow.saveSettings({ sidebarExpandedFolderIds: [RECENT_FOLDER_ID] })
    useAppSettings().load()

    const wrapper = mountSidebar()
    await flushPromises()

    // 一次性迁移：我的空间被展开，资料库可见
    expect(wrapper.text()).toContain('工作区')
    expect((window.markflow.getSettings() as { myFolderIntroMigrated?: boolean }).myFolderIntroMigrated).toBe(true)

    // 迁移后用户手动折叠的意图应被保留
    await wrapper.get('[data-testid="sidebar-space-my-toggle"]').trigger('click')
    await flushPromises()
    await wrapper.unmount()

    const wrapper2 = mountSidebar()
    await flushPromises()
    expect(wrapper2.find('[data-testid="sidebar-space-body-my"]').exists()).toBe(false)
  })

  it('does not render a my-folder drop target after D1 flattening', async () => {
    const store = useNoteStore()
    const parent = store.createFolder('工作区')
    store.createFolder('子文件夹', parent.id)

    const wrapper = mountSidebar()
    await flushPromises()

    expect(findFolderRow(wrapper, '我的文件夹')).toBeUndefined()
  })

  it('move note modal root target uses 我的空间 instead of 我的文件夹', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# 根笔记\n')

    const wrapper = mountSidebar()
    await flushPromises()

    await wrapper.get('.note-context-trigger').trigger('click')
    await flushPromises()
    const moveBtn = wrapper
      .get('.context-menu-fixed')
      .findAll('button')
      .find((btn) => btn.text() === '移动到')
    expect(moveBtn).toBeTruthy()
    await moveBtn!.trigger('click')
    await flushPromises()

    const list = wrapper.get('.move-folder-list')
    expect(list.text()).toContain('我的空间')
    expect(list.text()).not.toContain('我的文件夹')
  })

  it('move folder modal root target uses 我的空间 instead of 我的文件夹', async () => {
    const store = useNoteStore()
    const folder = store.createFolder('工作区')

    const wrapper = mountSidebar()
    await flushPromises()

    await wrapper.get(`[data-testid="sidebar-space-item-${folder.id}"]`).element.parentElement!.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 12, clientY: 34 })
    )
    await flushPromises()
    const moveBtn = wrapper
      .get('.context-menu-fixed')
      .findAll('button')
      .find((btn) => btn.text() === '移动到')
    expect(moveBtn).toBeTruthy()
    await moveBtn!.trigger('click')
    await flushPromises()

    const list = wrapper.get('.move-folder-list')
    expect(list.text()).toContain('我的空间')
    expect(list.text()).not.toContain('我的文件夹')
  })
})

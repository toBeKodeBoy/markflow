import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import EditorTabBar from '../../../src/components/EditorTabBar.vue'
import { useNoteStore } from '../../../src/stores/note'
import { useEditorTabsStore } from '../../../src/stores/editorTabs'

let pinia: Pinia

function mountTabBar() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  return mount(EditorTabBar, {
    attachTo: container,
    global: {
      plugins: [pinia],
      stubs: {
        Teleport: true,
        CreateEntryModal: {
          props: ['visible'],
          template: '<div v-if="visible">新建内容</div>',
        },
      },
    },
  })
}

describe('EditorTabBar', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('shows current, other, and all close actions in the tab context menu', async () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const a = noteStore.createNoteWithContent('# A\n')
    const b = noteStore.createNoteWithContent('# B\n')
    tabsStore.openTab(a.id)
    tabsStore.openTab(b.id)

    const wrapper = mountTabBar()
    await wrapper.findAll('.editor-tab')[0].trigger('contextmenu', { clientX: 80, clientY: 60 })

    const menu = document.body.querySelector('[data-testid="tab-context-menu"]')
    expect(menu).not.toBeNull()
    expect(menu?.textContent).toContain('关闭当前标签页')
    expect(menu?.textContent).toContain('关闭其他标签页')
    expect(menu?.textContent).toContain('关闭所有标签页')
  })

  it('disables "close other tabs" when only one tab is open', async () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const note = noteStore.createNoteWithContent('# A\n')
    tabsStore.openTab(note.id)

    const wrapper = mountTabBar()
    await wrapper.find('.editor-tab').trigger('contextmenu', { clientX: 40, clientY: 32 })

    const buttons = [...document.body.querySelectorAll<HTMLButtonElement>('[data-testid="tab-context-menu"] button')]
    const closeOthers = buttons.find((button) => button.textContent?.includes('关闭其他标签页'))
    expect(closeOthers?.disabled).toBe(true)
  })

  it('opens a unified dirty confirmation modal for bulk close actions', async () => {
    const noteStore = useNoteStore()
    const tabsStore = useEditorTabsStore()
    const a = noteStore.createNoteWithContent('# A\n')
    const b = noteStore.createNoteWithContent('# B\n')
    tabsStore.openTab(a.id)
    tabsStore.openTab(b.id)
    tabsStore.setTabLiveContent(a.id, '# A draft\n')

    const wrapper = mountTabBar()
    await wrapper.findAll('.editor-tab')[1].trigger('contextmenu', { clientX: 88, clientY: 44 })

    const buttons = [...document.body.querySelectorAll<HTMLButtonElement>('[data-testid="tab-context-menu"] button')]
    const closeOthers = buttons.find((button) => button.textContent?.includes('关闭其他标签页'))
    expect(closeOthers).toBeTruthy()
    await closeOthers!.click()

    const modal = document.body.querySelector('[data-testid="tab-close-confirm"]')
    expect(modal).not.toBeNull()
    expect(modal?.textContent).toContain('保存并关闭')
    expect(modal?.textContent).toContain('直接关闭')
    expect(modal?.textContent).toContain('取消')
  })

  it('does not render the redundant add button in the tab bar', async () => {
    const wrapper = mountTabBar()
    await flushPromises()

    expect(wrapper.find('.editor-tab-add').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('新建内容')
  })
})

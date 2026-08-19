import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import CreateEntryModal from '../../../src/components/CreateEntryModal.vue'
import { useNoteStore } from '../../../src/stores/note'

let pinia: Pinia

function mountModal(props?: Partial<InstanceType<typeof CreateEntryModal>['$props']>) {
  return mount(CreateEntryModal, {
    props: {
      visible: true,
      defaultKind: 'note',
      folders: [],
      activeFolderId: null,
      ...props,
    },
    global: {
      plugins: [pinia],
      stubs: {
        AppIcon: true,
      },
    },
  })
}

describe('CreateEntryModal', () => {
  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('新建文件选项应对用户说文档而非笔记', async () => {
    const wrapper = mountModal()
    await flushPromises()
    expect(wrapper.find('[data-testid="create-entry-template-blank"]').text()).toBe('空白文档')
    expect(wrapper.text()).toContain('创建空白 Markdown 文档')
    expect(wrapper.text()).not.toContain('空白笔记')
    expect(wrapper.text()).not.toContain('Markdown 笔记')
  })

  it('默认新建文件时可直接创建笔记并透出 parentId', async () => {
    const store = useNoteStore()
    const folder = store.createFolder('文档')
    const wrapper = mountModal({
      folders: store.folderList,
      activeFolderId: folder.id,
      defaultParentId: folder.id,
    })

    await flushPromises()
    await wrapper.find('form').trigger('submit.prevent')

    expect(store.noteList).toHaveLength(1)
    expect(store.currentNote?.folderId).toBe(folder.id)
    expect(wrapper.emitted('created')?.[0]?.[0]).toMatchObject({
      kind: 'note',
      parentId: folder.id,
    })
  })

  it('新建文件夹时名称为空不可提交，填写后创建到指定目录', async () => {
    const store = useNoteStore()
    const parent = store.createFolder('项目')
    const wrapper = mountModal({
      defaultKind: 'folder',
      folders: store.folderList,
      defaultParentId: parent.id,
      activeFolderId: parent.id,
    })

    await flushPromises()
    const submit = wrapper.find('.btn-primary')
    expect((submit.element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.find('.create-entry-input').setValue('设计稿')
    await wrapper.find('form').trigger('submit.prevent')

    const createdFolder = store.folderList.find((item) => item.name === '设计稿')
    expect(createdFolder).toBeTruthy()
    expect(createdFolder?.parentId).toBe(parent.id)
    expect(wrapper.emitted('created')?.[0]?.[0]).toMatchObject({
      kind: 'folder',
      parentId: parent.id,
    })
  })

  it('新建文件时展示模板选择，默认空白，选模板后按模板创建', async () => {
    const store = useNoteStore()
    const wrapper = mountModal({ folders: store.folderList })

    await flushPromises()
    expect(wrapper.find('[data-testid="create-entry-templates"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="create-entry-template-blank"]').exists()).toBe(true)

    await wrapper.findAll('[data-testid="create-entry-template-option"]')[0].trigger('click')
    await wrapper.find('form').trigger('submit.prevent')

    expect(store.noteList).toHaveLength(1)
    expect(store.noteList[0].title).toBe('技术开发文档')
    expect(store.getNoteContentById(store.noteList[0].id).length).toBeGreaterThan(180)
  })

  it('新建文件夹时不展示模板选择', async () => {
    const wrapper = mountModal({ defaultKind: 'folder', folders: [] })
    await flushPromises()
    expect(wrapper.find('[data-testid="create-entry-templates"]').exists()).toBe(false)
  })

  it('锁定目录时不展示下拉选择，只显示目标路径', async () => {
    const store = useNoteStore()
    const parent = store.createFolder('知识库')
    const child = store.createFolder('前端', parent.id)
    const wrapper = mountModal({
      defaultKind: 'folder',
      folders: store.folderList,
      lockedParentId: child.id,
      defaultParentId: parent.id,
    })

    await flushPromises()

    expect(wrapper.find('.create-entry-select').exists()).toBe(false)
    expect(wrapper.find('.create-entry-location-pill').text()).toContain('知识库 / 前端')
  })

  it('根目录选项展示「我的空间」而非「我的文件夹」', async () => {
    const wrapper = mountModal({ folders: [] })
    await flushPromises()

    const rootOption = wrapper.find('.create-entry-select option[value="__root__"]')
    expect(rootOption.exists()).toBe(true)
    expect(rootOption.text()).toBe('我的空间')
    expect(wrapper.text()).not.toContain('我的文件夹')
  })

  it('锁定根目录时路径胶囊展示「我的空间」', async () => {
    const wrapper = mountModal({
      folders: [],
      lockedParentId: null,
    })
    await flushPromises()

    expect(wrapper.find('.create-entry-select').exists()).toBe(false)
    expect(wrapper.find('.create-entry-location-pill').text()).toBe('我的空间')
    expect(wrapper.text()).not.toContain('我的文件夹')
  })
})

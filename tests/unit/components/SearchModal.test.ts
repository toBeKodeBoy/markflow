import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import SearchModal from '../../../src/components/SearchModal.vue'
import { useNoteStore } from '../../../src/stores/note'

let pinia: Pinia

function mountModal(props?: Partial<InstanceType<typeof SearchModal>['$props']>) {
  return mount(SearchModal, {
    props: {
      visible: true,
      ...props,
    },
    global: {
      plugins: [pinia],
      stubs: { Teleport: true },
    },
  })
}

describe('SearchModal', () => {
  beforeEach(async () => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    // 初始化 appSettings
    const { useAppSettings } = await import('../../../src/composables/useAppSettings')
    useAppSettings().load()
  })

  it('visible=false 时不渲染弹窗内容', () => {
    const wrapper = mountModal({ visible: false })
    expect(wrapper.find('.search-modal').exists()).toBe(false)
  })

  it('visible=true 时渲染弹窗并自动聚焦输入框', async () => {
    const wrapper = mountModal({ visible: true })
    await flushPromises()
    expect(wrapper.find('.search-modal').exists()).toBe(true)
    expect(wrapper.find('.search-modal-input').exists()).toBe(true)
  })

  it('弹窗 aria 与输入框应使用「搜索文档」而非「搜索笔记」', () => {
    const wrapper = mountModal()
    const dialog = wrapper.find('.search-modal')
    const input = wrapper.find('.search-modal-input')
    expect(dialog.attributes('aria-label')).toBe('搜索文档')
    expect(input.attributes('aria-label')).toBe('搜索文档')
    expect(input.attributes('placeholder')).toBe('搜索文档标题或正文...')
  })

  it('头部应使用 AppIcon search 而非 emoji', () => {
    const wrapper = mount(SearchModal, {
      props: { visible: true },
      global: {
        plugins: [pinia],
        stubs: {
          Teleport: true,
          AppIcon: {
            props: ['name', 'size'],
            template: '<span class="stub-app-icon" :data-name="name" />',
          },
        },
      },
    })
    const icon = wrapper.find('.stub-app-icon')
    expect(icon.exists()).toBe(true)
    expect(icon.attributes('data-name')).toBe('search')
    expect(wrapper.text()).not.toContain('🔍')
  })

  it('输入关键字后展示匹配的笔记结果', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# 项目周报\n')
    store.createNoteWithContent('# 会议纪要\n')

    const wrapper = mountModal()
    await flushPromises()

    await wrapper.find('.search-modal-input').setValue('项目')
    await flushPromises()

    const items = wrapper.findAll('.search-modal-item')
    expect(items.length).toBeGreaterThanOrEqual(1)
    expect(items.some((item) => item.text().includes('项目周报'))).toBe(true)
  })

  it('可以通过正文搜索到笔记', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# 周报\n这里有唯一关键词')

    const wrapper = mountModal()
    await flushPromises()

    await wrapper.find('.search-modal-input').setValue('唯一关键词')
    await flushPromises()

    const items = wrapper.findAll('.search-modal-item')
    expect(items).toHaveLength(1)
    expect(items[0].text()).toContain('周报')
  })

  it('标题匹配优先于正文匹配排序', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# 工作日志\n正文普通')
    store.createNoteWithContent('# 日常笔记\n这里提到工作')

    const wrapper = mountModal()
    await flushPromises()

    await wrapper.find('.search-modal-input').setValue('工作')
    await flushPromises()

    const items = wrapper.findAll('.search-modal-item')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('工作日志')
  })

  it('无匹配结果时显示空状态', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# 项目周报\n')

    const wrapper = mountModal()
    await flushPromises()

    await wrapper.find('.search-modal-input').setValue('不存在的关键词xyz')
    await flushPromises()

    expect(wrapper.find('.search-modal-empty').exists()).toBe(true)
  })

  it('点击 overlay 触发 close 事件', async () => {
    const wrapper = mountModal()
    await flushPromises()

    await wrapper.find('.search-modal-overlay').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('Escape 键触发 close 事件', async () => {
    const wrapper = mountModal()
    await flushPromises()

    await wrapper.find('.search-modal-input').trigger('keydown.escape')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('选择笔记后触发 select 和 close 事件', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# 测试笔记\n')

    const wrapper = mountModal()
    await flushPromises()

    await wrapper.find('.search-modal-input').setValue('测试')
    await flushPromises()

    const item = wrapper.find('.search-modal-item')
    await item.trigger('click')

    expect(wrapper.emitted('select')?.[0]?.[0]).toBe(store.noteList[0].id)
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('键盘上下切换选中项并支持 Enter 确认', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# 笔记一\n')
    store.createNoteWithContent('# 笔记二\n')

    const wrapper = mountModal()
    await flushPromises()

    await wrapper.find('.search-modal-input').setValue('笔记')
    await flushPromises()

    const input = wrapper.find('.search-modal-input')
    expect(wrapper.findAll('.search-modal-item')[0].classes()).toContain('active')

    await input.trigger('keydown', { key: 'ArrowDown' })
    await flushPromises()
    expect(wrapper.findAll('.search-modal-item')[1].classes()).toContain('active')

    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wrapper.emitted('select')).toBeTruthy()
  })

  it('visible 重开时会清空查询', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# 测试笔记\n')

    const wrapper = mountModal({ visible: true })
    await flushPromises()

    await wrapper.find('.search-modal-input').setValue('测试')
    await flushPromises()

    await wrapper.setProps({ visible: false })
    await flushPromises()
    await wrapper.setProps({ visible: true })
    await flushPromises()

    expect(wrapper.find<HTMLInputElement>('.search-modal-input').element.value).toBe('')
  })

  it('输入关键字时同步到 store.searchQuery，关闭后清空', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# 同步笔记\n')

    const wrapper = mountModal({ visible: true })
    await flushPromises()

    await wrapper.find('.search-modal-input').setValue('同步')
    await flushPromises()
    expect(store.searchQuery).toBe('同步')

    await wrapper.setProps({ visible: false })
    await flushPromises()
    expect(store.searchQuery).toBe('')
  })

  describe('最近打开笔记功能', () => {
    it('弹窗打开时应展示最近打开的笔记列表', async () => {
      const store = useNoteStore()
      // 创建一些笔记
      store.createNoteWithContent('# 笔记 A')
      store.createNoteWithContent('# 笔记 B')

      // 先设置访问记录（在挂载组件之前）
      const appSettings = (await import('../../../src/composables/useAppSettings')).useAppSettings()
      appSettings.save({
        recentNoteAccess: [
          { noteId: store.noteList[0].id, openedAt: Date.now() - 2000 },
          { noteId: store.noteList[1].id, openedAt: Date.now() },
        ],
      })

      const wrapper = mountModal({ visible: true })
      await flushPromises()

      // 应该显示最近笔记区域
      const recentSection = wrapper.find('.search-modal-recent-section')
      expect(recentSection.exists()).toBe(true)

      // 应该显示标题
      const header = wrapper.find('.search-modal-recent-header')
      expect(header.exists()).toBe(true)
      expect(header.text()).toBe('最近打开')

      // 应该显示笔记条目
      const items = wrapper.findAll('.search-modal-item')
      expect(items.length).toBeGreaterThanOrEqual(2)
    })

    it('输入关键词后应隐藏最近笔记区域', async () => {
      const store = useNoteStore()
      store.createNoteWithContent('# 测试笔记')

      // 先设置访问记录（在挂载组件之前）
      const appSettings = (await import('../../../src/composables/useAppSettings')).useAppSettings()
      appSettings.save({
        recentNoteAccess: [{ noteId: store.noteList[0].id, openedAt: Date.now() }],
      })

      const wrapper = mountModal({ visible: true })
      await flushPromises()

      // 初始时显示最近笔记
      expect(wrapper.find('.search-modal-recent-section').exists()).toBe(true)

      // 输入关键词
      await wrapper.find('.search-modal-input').setValue('测试')
      await flushPromises()

      // 最近笔记区域应消失
      expect(wrapper.find('.search-modal-recent-section').exists()).toBe(false)
    })

    it('无最近笔记时应不显示最近笔记区域', async () => {
      const store = useNoteStore()
      // 不创建任何访问记录

      const wrapper = mountModal({ visible: true })
      await flushPromises()

      // 不应该显示最近笔记区域
      expect(wrapper.find('.search-modal-recent-section').exists()).toBe(false)
    })

    it('点击最近笔记应触发 select 事件并关闭弹窗', async () => {
      const store = useNoteStore()
      store.createNoteWithContent('# 可点击笔记')

      // 先设置访问记录（在挂载组件之前）
      const appSettings = (await import('../../../src/composables/useAppSettings')).useAppSettings()
      appSettings.save({
        recentNoteAccess: [{ noteId: store.noteList[0].id, openedAt: Date.now() }],
      })

      const wrapper = mountModal({ visible: true })
      await flushPromises()

      // 点击第一个最近笔记
      const firstItem = wrapper.find('.search-modal-item')
      await firstItem.trigger('click')
      await flushPromises()

      // 应该触发了 select 事件
      expect(wrapper.emitted('select')).toHaveLength(1)
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('点击最近笔记应记录搜索交互', async () => {
      const store = useNoteStore()
      store.createNoteWithContent('# 记录测试笔记')
      const noteId = store.noteList[0].id

      // 先设置访问记录（在挂载组件之前）
      const appSettings = (await import('../../../src/composables/useAppSettings')).useAppSettings()
      appSettings.save({
        recentNoteAccess: [{ noteId, openedAt: Date.now() }],
      })

      const wrapper = mountModal({ visible: true })
      await flushPromises()

      // 点击最近笔记
      await wrapper.find('.search-modal-item').trigger('click')
      await flushPromises()

      // 检查 localStorage 中是否记录了搜索交互
      const history = JSON.parse(localStorage.getItem('markflow.searchHistory') ?? '[]')
      expect(history).toHaveLength(1)
      expect(history[0].noteId).toBe(noteId)
      expect(history[0].searchedAt).toBeDefined()
    })
  })
})

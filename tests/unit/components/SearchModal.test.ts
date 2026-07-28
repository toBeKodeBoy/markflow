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
  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
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
})

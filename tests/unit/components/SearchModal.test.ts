import { describe, it, expect, beforeEach, vi } from 'vitest'
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
    const input = wrapper.find<HTMLInputElement>('.search-modal-input')
    expect(input.exists()).toBe(true)
  })

  it('输入关键词后展示匹配的笔记结果', async () => {
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

  it('无匹配结果时显示空状态', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# 项目周报\n')

    const wrapper = mountModal()
    await flushPromises()

    await wrapper.find('.search-modal-input').setValue('不存在的关键词xyz')
    await flushPromises()

    expect(wrapper.find('.search-modal-empty').exists()).toBe(true)
    expect(wrapper.find('.search-modal-empty').text()).toContain('未找到')
  })

  it('点击 overlay 触发 close 事件', async () => {
    const wrapper = mountModal()
    await flushPromises()

    await wrapper.find('.search-modal-overlay').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('点击弹窗内部不触发 close', async () => {
    const wrapper = mountModal()
    await flushPromises()

    await wrapper.find('.search-modal').trigger('click')
    expect(wrapper.emitted('close')).toBeFalsy()
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
    expect(item.exists()).toBe(true)
    await item.trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0][0]).toBe(store.noteList[0].id)
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('键盘 ↓↑ 可切换选中项，Enter 确认选择', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# 笔记一\n')
    store.createNoteWithContent('# 笔记二\n')

    const wrapper = mountModal()
    await flushPromises()

    await wrapper.find('.search-modal-input').setValue('笔记')
    await flushPromises()

    const input = wrapper.find('.search-modal-input')
    const items = wrapper.findAll('.search-modal-item')
    expect(items.length).toBe(2)
    expect(items[0].classes()).toContain('active')

    await input.trigger('keydown', { key: 'ArrowDown' })
    await flushPromises()

    const itemsAfterDown = wrapper.findAll('.search-modal-item')
    expect(itemsAfterDown[1].classes()).toContain('active')

    await input.trigger('keydown', { key: 'ArrowUp' })
    await flushPromises()

    expect(wrapper.findAll('.search-modal-item')[0].classes()).toContain('active')

    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(wrapper.emitted('select')).toBeTruthy()
  })

  it('visible 从 true 变为 false 时清空查询并重置结果', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# 测试笔记\n')

    const wrapper = mountModal({ visible: true })
    await flushPromises()

    await wrapper.find('.search-modal-input').setValue('测试')
    await flushPromises()

    expect(wrapper.findAll('.search-modal-item').length).toBeGreaterThanOrEqual(1)

    await wrapper.setProps({ visible: false })
    await flushPromises()

    await wrapper.setProps({ visible: true })
    await flushPromises()

    const input = wrapper.find<HTMLInputElement>('.search-modal-input')
    expect(input.element.value).toBe('')
  })

  it('通过标签可以搜索到笔记', async () => {
    const store = useNoteStore()
    const note = store.createNoteWithContent('# 周报\n')
    store.setNoteTags(note.id, ['工作'])

    const wrapper = mountModal()
    await flushPromises()

    await wrapper.find('.search-modal-input').setValue('工作')
    await flushPromises()

    const items = wrapper.findAll('.search-modal-item')
    expect(items.length).toBe(1)
    expect(items[0].text()).toContain('周报')
  })

  it('标题匹配排在标签匹配前面', async () => {
    const store = useNoteStore()
    const noteA = store.createNoteWithContent('# 工作日志\n')
    store.setNoteTags(noteA.id, ['其他'])
    const noteB = store.createNoteWithContent('# 日常笔记\n')
    store.setNoteTags(noteB.id, ['工作'])

    const wrapper = mountModal()
    await flushPromises()

    await wrapper.find('.search-modal-input').setValue('工作')
    await flushPromises()

    const items = wrapper.findAll('.search-modal-item')
    expect(items.length).toBe(2)
    expect(items[0].text()).toContain('工作日志')
  })

  it('结果列表具有正确的无障碍属性', async () => {
    const store = useNoteStore()
    store.createNoteWithContent('# 测试\n')

    const wrapper = mountModal()
    await flushPromises()

    await wrapper.find('.search-modal-input').setValue('测试')
    await flushPromises()

    const list = wrapper.find('#search-results-list')
    expect(list.attributes('role')).toBe('listbox')

    const option = wrapper.find('.search-modal-item')
    expect(option.attributes('role')).toBe('option')
    expect(option.attributes('aria-selected')).toBe('true')

    const input = wrapper.find('.search-modal-input')
    expect(input.attributes('aria-autocomplete')).toBe('list')
    expect(input.attributes('aria-controls')).toBe('search-results-list')
    expect(input.attributes('aria-activedescendant')).toBe(option.attributes('id'))
  })
})

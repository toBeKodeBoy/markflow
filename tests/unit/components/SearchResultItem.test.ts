import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SearchResultItem from '../../../src/components/SearchResultItem.vue'

describe('SearchResultItem', () => {
  const note = {
    id: 'note-1',
    title: '项目周报',
    updatedAt: Date.now(),
    tags: ['工作'],
    pinned: false,
  }

  it('双击标题应触发开始重命名事件', async () => {
    const wrapper = mount(SearchResultItem, {
      props: {
        note,
        query: '项目',
        folders: [],
        content: '# 项目周报',
        renamingNoteId: null,
        renamingNoteName: '',
      },
    })

    await wrapper.get('.search-result-item').trigger('dblclick')

    expect(wrapper.emitted('start-rename-note')).toEqual([['note-1']])
  })

  it('编辑态按回车应触发提交，且不触发选择事件', async () => {
    const wrapper = mount(SearchResultItem, {
      props: {
        note,
        query: '项目',
        folders: [],
        content: '# 项目周报',
        renamingNoteId: 'note-1',
        renamingNoteName: '新周报',
      },
    })

    const input = wrapper.get('input.rename-input')
    await input.trigger('click')
    await input.trigger('keyup.enter')

    expect(wrapper.emitted('commit-rename-note')).toBeTruthy()
    expect(wrapper.emitted('select')).toBeFalsy()
  })

  it('键盘按 Space 应触发选择事件', async () => {
    const wrapper = mount(SearchResultItem, {
      props: {
        note,
        query: '项目',
        folders: [],
        content: '# 项目周报',
        renamingNoteId: null,
        renamingNoteName: '',
      },
    })

    await wrapper.get('.search-result-item').trigger('keydown', { key: ' ' })

    expect(wrapper.emitted('select')).toEqual([['note-1']])
  })
})

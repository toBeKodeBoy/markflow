import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SidebarTreeRow from '../../../src/components/SidebarTreeRow.vue'

describe('SidebarTreeRow', () => {
  it('双击笔记项应触发开始重命名事件', async () => {
    const wrapper = mount(SidebarTreeRow, {
      props: {
        row: {
          kind: 'note',
          depth: 0,
          note: {
            id: 'note-1',
            title: '周报',
            updatedAt: Date.now(),
            tags: [],
            pinned: false,
          },
        },
        expanded: false,
        activeFolderId: null,
        currentNoteId: undefined,
        renamingFolderId: null,
        renamingFolderName: '',
        renamingNoteId: null,
        renamingNoteName: '',
        dragOverFolderId: null,
      },
      global: {
        stubs: {
          AppIcon: true,
        },
      },
    })

    await wrapper.get('.tree-note-item').trigger('dblclick')

    expect(wrapper.emitted('start-rename-note')).toEqual([['note-1']])
  })

  it('笔记处于编辑态时应渲染输入框并派发提交事件', async () => {
    const wrapper = mount(SidebarTreeRow, {
      props: {
        row: {
          kind: 'note',
          depth: 0,
          note: {
            id: 'note-1',
            title: '周报',
            updatedAt: Date.now(),
            tags: [],
            pinned: false,
          },
        },
        expanded: false,
        activeFolderId: null,
        currentNoteId: undefined,
        renamingFolderId: null,
        renamingFolderName: '',
        renamingNoteId: 'note-1',
        renamingNoteName: '新标题',
        dragOverFolderId: null,
      },
      global: {
        stubs: {
          AppIcon: true,
        },
      },
    })

    const input = wrapper.get('input.rename-input')
    await input.trigger('keyup.enter')

    expect(wrapper.emitted('commit-rename-note')).toBeTruthy()
  })
})

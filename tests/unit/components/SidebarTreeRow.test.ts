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

  it('根级笔记 paddingLeft 应对齐根级文件夹文字（含 toggle 区域22px）', () => {
    const folderWrapper = mount(SidebarTreeRow, {
      props: {
        row: {
          kind: 'folder',
          depth: 0,
          folder: { id: 'f1', name: 'docs', order: 0 },
          hasChildren: true,
          noteCount: 2,
        },
        expanded: false,
        activeFolderId: null,
        renamingFolderId: null,
        renamingFolderName: '',
        renamingNoteId: null,
        renamingNoteName: '',
        dragOverFolderId: null,
      },
      global: { stubs: { AppIcon: true } },
    })
    const folderPad = parseInt(
      (folderWrapper.element as HTMLElement).style.paddingLeft,
      10,
    )

    const noteWrapper = mount(SidebarTreeRow, {
      props: {
        row: {
          kind: 'note',
          depth: 0,
          note: {
            id: 'note-1',
            title: 'README',
            updatedAt: Date.now(),
            tags: [],
            pinned: false,
          },
          hasChildren: false,
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
      global: { stubs: { AppIcon: true } },
    })
    const notePad = parseInt(
      (noteWrapper.element as HTMLElement).style.paddingLeft,
      10,
    )

    // folder paddingLeft + 16px toggle + 6px gap = note text aligns with folder text
    expect(notePad).toBe(folderPad + 22)
  })

  it('嵌套笔记 paddingLeft 应保持与文件夹子级对齐', () => {
    const nestedFolderWrapper = mount(SidebarTreeRow, {
      props: {
        row: {
          kind: 'folder',
          depth: 1,
          folder: { id: 'f2', name: 'api', order: 0, parentId: 'f1' },
          hasChildren: false,
        },
        expanded: false,
        activeFolderId: null,
        renamingFolderId: null,
        renamingFolderName: '',
        renamingNoteId: null,
        renamingNoteName: '',
        dragOverFolderId: null,
      },
      global: { stubs: { AppIcon: true } },
    })
    const nestedFolderPad = parseInt(
      (nestedFolderWrapper.element as HTMLElement).style.paddingLeft,
      10,
    )

    const nestedNoteWrapper = mount(SidebarTreeRow, {
      props: {
        row: {
          kind: 'note',
          depth: 1,
          note: {
            id: 'note-2',
            title: 'Guide',
            updatedAt: Date.now(),
            tags: [],
            pinned: false,
          },
          hasChildren: false,
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
      global: { stubs: { AppIcon: true } },
    })
    const nestedNotePad = parseInt(
      (nestedNoteWrapper.element as HTMLElement).style.paddingLeft,
      10,
    )

    // notePad + 22 补偿 toggle 区域，使笔记文字与文件夹文字对齐
    expect(nestedNotePad).toBe(nestedFolderPad + 22)
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

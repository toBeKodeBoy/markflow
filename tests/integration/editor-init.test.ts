/**
 * Editor 组件 CodeMirror 初始化
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Editor from '@/components/Editor.vue'
import { useNoteStore } from '@/stores/note'

describe('Editor CodeMirror init', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    const store = useNoteStore()
    store.createNote()
  })

  it('分屏编辑器应成功挂载 CodeMirror', async () => {
    const store = useNoteStore()
    store.setLiveContent('# hello\n\n```javascript\nconsole.log(1)\n```\n')
    const wrapper = mount(Editor)
    await flushPromises()
    expect(wrapper.find('.cm-editor').exists()).toBe(true)
  })
})

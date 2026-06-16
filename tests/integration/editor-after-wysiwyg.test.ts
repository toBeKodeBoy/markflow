/**
 * live → split 切换时 Editor 初始化
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import WysiwygEditor from '@/components/WysiwygEditor.vue'
import Editor from '@/components/Editor.vue'
import { useNoteStore } from '@/stores/note'

const welcome = `# 欢迎使用 MarkFlow 👋

> **MarkFlow** 是一款基于 uTools 的本地 Markdown 编辑器

## 代码示例

\`\`\`javascript
console.log('Hello, MarkFlow!')
\`\`\`

| 操作 | 快捷键 |
| --- | --- |
| 撤销 | Ctrl+Z |
`

describe('live → split Editor init', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    const store = useNoteStore()
    store.createNoteWithContent(welcome)
  })

  it('从 WYSIWYG 切换后 Editor 应成功挂载', async () => {
    const store = useNoteStore()
    const wysiwyg = mount(WysiwygEditor)
    await flushPromises()
    await new Promise((r) => setTimeout(r, 500))
    await wysiwyg.unmount()
    await flushPromises()

    store.updateCurrentContent(store.liveContent)
    const editor = mount(Editor)
    await flushPromises()
    expect(editor.find('.cm-editor').exists()).toBe(true)
  }, 15000)
})

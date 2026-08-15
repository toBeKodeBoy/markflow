import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNoteHistory } from '../../../src/composables/useNoteHistory'
import { useNoteStore } from '../../../src/stores/note'
import { useEditorTabsStore } from '../../../src/stores/editorTabs'

describe('useNoteHistory', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('无浏览历史时后退与前进均不可用', () => {
    const history = useNoteHistory()
    expect(history.canGoBack.value).toBe(false)
    expect(history.canGoForward.value).toBe(false)
  })

  it('打开两篇笔记后可后退到上一篇，再前进回来', () => {
    const store = useNoteStore()
    const tabs = useEditorTabsStore()
    const a = store.createNoteWithContent('# A\n')
    const b = store.createNoteWithContent('# B\n')
    const history = useNoteHistory()

    tabs.openTab(a.id)
    tabs.openTab(b.id)

    expect(tabs.activeTabId).toBe(b.id)
    expect(history.canGoBack.value).toBe(true)
    expect(history.canGoForward.value).toBe(false)

    history.goBack()
    expect(tabs.activeTabId).toBe(a.id)
    expect(history.canGoBack.value).toBe(false)
    expect(history.canGoForward.value).toBe(true)

    history.goForward()
    expect(tabs.activeTabId).toBe(b.id)
    expect(history.canGoForward.value).toBe(false)
  })

  it('后退后再打开新笔记应丢掉前进栈', () => {
    const store = useNoteStore()
    const tabs = useEditorTabsStore()
    const a = store.createNoteWithContent('# A\n')
    const b = store.createNoteWithContent('# B\n')
    const c = store.createNoteWithContent('# C\n')
    const history = useNoteHistory()

    tabs.openTab(a.id)
    tabs.openTab(b.id)
    history.goBack()
    tabs.openTab(c.id)

    expect(tabs.activeTabId).toBe(c.id)
    expect(history.canGoForward.value).toBe(false)
    expect(history.canGoBack.value).toBe(true)

    history.goBack()
    expect(tabs.activeTabId).toBe(a.id)
  })

  it('在订阅前打开的笔记也应进入浏览栈', () => {
    const store = useNoteStore()
    const tabs = useEditorTabsStore()
    const a = store.createNoteWithContent('# A\n')
    const b = store.createNoteWithContent('# B\n')

    tabs.openTab(a.id)
    tabs.openTab(b.id)

    const history = useNoteHistory()
    expect(history.canGoBack.value).toBe(true)

    history.goBack()
    expect(tabs.activeTabId).toBe(a.id)
  })

  it('删除上一篇后后退不可用且保持当前笔记', () => {
    const store = useNoteStore()
    const tabs = useEditorTabsStore()
    const a = store.createNoteWithContent('# A\n')
    const b = store.createNoteWithContent('# B\n')
    const history = useNoteHistory()

    tabs.openTab(a.id)
    tabs.openTab(b.id)
    store.deleteNote(a.id)

    expect(history.canGoBack.value).toBe(false)
    history.goBack()
    expect(tabs.activeTabId).toBe(b.id)
  })
})

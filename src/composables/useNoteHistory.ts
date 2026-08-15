import { storeToRefs } from 'pinia'
import { useEditorTabsStore } from '../stores/editorTabs'

/** 笔记浏览前进/后退。栈记在页签 store，历史导航不改写 recentNoteAccess。 */
export function useNoteHistory() {
  const tabsStore = useEditorTabsStore()
  const { canGoBack, canGoForward } = storeToRefs(tabsStore)
  return {
    canGoBack,
    canGoForward,
    goBack: tabsStore.goHistoryBack,
    goForward: tabsStore.goHistoryForward,
  }
}

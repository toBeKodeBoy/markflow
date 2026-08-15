import { useNoteStore } from '../stores/note'
import { useEditorTabsStore } from '../stores/editorTabs'
import { hasRelativeImageReferences } from '../utils/importFolderHelpers'
import { showAppNotification } from '../utils/notify'

function pickMarkdownFileInBrowser(): Promise<{ content: string; name: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.txt'
    if (typeof input.addEventListener === 'function') {
      input.addEventListener('cancel', () => resolve(null), { once: true })
    }
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        resolve({ content: String(reader.result ?? ''), name: file.name })
      }
      reader.onerror = () => resolve(null)
      reader.readAsText(file)
    }
    input.click()
  })
}

export function useImportMarkdown() {
  const store = useNoteStore()
  const tabsStore = useEditorTabsStore()

  async function importMarkdownToActiveFolder(): Promise<boolean> {
    const folderId = store.activeFolderId ?? undefined

    if (typeof window !== 'undefined' && typeof window.markflow !== 'undefined') {
      const file = window.markflow.openMarkdownFile()
      if (file === null) return false
      const result = await store.importMarkdownFile(file, folderId)
      tabsStore.openTabForNewNote(result.note.id)
      const warning = result.warnings[0]
      if (warning) {
        window.markflow.showNotification(`导入完成，但图片处理失败：${warning}`)
        return true
      }
      window.markflow.showNotification('导入成功')
      return true
    }

    const picked = await pickMarkdownFileInBrowser()
    if (!picked) return false
    if (hasRelativeImageReferences(picked.content)) {
      window.alert('浏览器环境下，含本地图片的 Markdown 请使用“导入文件夹”')
      return false
    }
    const result = await store.importMarkdownFile({
      content: picked.content,
      path: picked.name,
      name: picked.name,
      images: [],
    }, folderId)
    tabsStore.openTabForNewNote(result.note.id)
    showAppNotification('导入成功')
    return true
  }

  return { importMarkdownToActiveFolder }
}

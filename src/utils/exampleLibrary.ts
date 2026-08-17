import { useNoteStore } from '../stores/note'
import { useEditorTabsStore } from '../stores/editorTabs'
import { useAppSettings } from '../composables/useAppSettings'
import { MY_FOLDER_ID } from '../constants/myFolder'
import { showAppNotification } from './notify'
import {
  EXAMPLE_LIBRARY,
  EXAMPLE_LIBRARY_OPEN_NOTE_TITLE,
} from '../constants/exampleLibrary'

export interface ImportExampleLibraryResult {
  created: boolean
  openedNoteId: string | null
}

function findRootFolderByName(name: string) {
  const store = useNoteStore()
  return store.folderList.find((folder) => folder.name === name && !folder.parentId)
}

export function importExampleLibrary(): ImportExampleLibraryResult {
  const store = useNoteStore()
  const tabsStore = useEditorTabsStore()
  const appSettings = useAppSettings()

  let created = false
  let openedNoteId: string | null = null
  const expanded = new Set(appSettings.get().sidebarExpandedFolderIds ?? [])
  const expandedSpaces = new Set(appSettings.get().sidebarExpandedSpaceIds ?? [])
  expanded.add(MY_FOLDER_ID)
  expandedSpaces.add(MY_FOLDER_ID)

  for (const folderSeed of EXAMPLE_LIBRARY) {
    let folder = findRootFolderByName(folderSeed.name)
    if (!folder) {
      folder = store.createFolder(folderSeed.name) ?? undefined
      created = true
    }
    if (!folder) continue
    expanded.add(folder.id)
    expandedSpaces.add(folder.id)
    for (const noteSeed of folderSeed.notes) {
      const existed = store.noteList.find(
        (item) => item.title === noteSeed.title && item.folderId === folder.id,
      )
      const note = existed
        ?? store.createNoteWithContent(noteSeed.content, {
          folderId: folder.id,
          title: noteSeed.title,
        })
      if (!existed) created = true
      if (noteSeed.title === EXAMPLE_LIBRARY_OPEN_NOTE_TITLE) openedNoteId = note.id
    }
  }

  if (!openedNoteId) {
    openedNoteId = store.noteList.find((item) => item.title === EXAMPLE_LIBRARY_OPEN_NOTE_TITLE)?.id ?? null
  }

  appSettings.save({
    exampleLibraryImported: true,
    sidebarExpandedFolderIds: [...expanded],
    sidebarExpandedSpaceIds: [...expandedSpaces],
  })
  store.notifySidebarStateChanged()
  if (openedNoteId) tabsStore.openTabForNewNote(openedNoteId)
  showAppNotification(created ? '已导入示例知识库' : '示例知识库已存在')
  return { created, openedNoteId }
}

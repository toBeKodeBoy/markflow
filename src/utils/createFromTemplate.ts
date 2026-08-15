import {
  buildTemplateNoteTitle,
  getNoteTemplate,
  renderTemplateContent,
  uniquifyNoteTitle,
  type NoteTemplateId,
} from '../constants/noteTemplates'
import { useNoteStore } from '../stores/note'
import type { Note } from '../types'

export function createNoteFromTemplate(id: NoteTemplateId, folderId?: string): Note | null {
  const template = getNoteTemplate(id)
  if (!template) return null

  const store = useNoteStore()
  const now = new Date()
  const baseTitle = buildTemplateNoteTitle(template, now)
  const title = uniquifyNoteTitle(
    baseTitle,
    store.noteList.map((item) => item.title),
  )
  const content = renderTemplateContent(template, title, now)
  return store.createNoteWithContent(content, { folderId, title })
}

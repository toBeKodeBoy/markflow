/** 解耦 note store 与 editorTabs store 的轻量桥接 */
let onNoteDeleted: ((noteId: string) => void) | null = null
let onLibraryReset: ((firstNoteId: string | null) => void) | null = null

export function registerEditorTabsBridge(handlers: {
  onNoteDeleted?: (noteId: string) => void
  onLibraryReset?: (firstNoteId: string | null) => void
}): void {
  if (handlers.onNoteDeleted) onNoteDeleted = handlers.onNoteDeleted
  if (handlers.onLibraryReset) onLibraryReset = handlers.onLibraryReset
}

export function notifyNoteDeleted(noteId: string): void {
  onNoteDeleted?.(noteId)
}

export function notifyLibraryReset(firstNoteId: string | null): void {
  onLibraryReset?.(firstNoteId)
}

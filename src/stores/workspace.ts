import { defineStore } from 'pinia'
import { ref } from 'vue'

export type WorkspaceView = 'home' | 'editor' | 'trash'

export const useWorkspaceStore = defineStore('workspace', () => {
  const view = ref<WorkspaceView>('home')

  function showHome(): void {
    view.value = 'home'
  }

  function showEditor(): void {
    view.value = 'editor'
  }

  function showTrash(): void {
    view.value = 'trash'
  }

  function showDocs(hasTabs: boolean): void {
    view.value = hasTabs ? 'editor' : 'home'
  }

  return { view, showHome, showEditor, showTrash, showDocs }
})

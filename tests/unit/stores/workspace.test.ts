import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWorkspaceStore } from '../../../src/stores/workspace'

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('默认 workspaceView 为 home', () => {
    const workspace = useWorkspaceStore()
    expect(workspace.view).toBe('home')
  })

  it('showEditor / showHome / showTrash 切换视图', () => {
    const workspace = useWorkspaceStore()
    workspace.showEditor()
    expect(workspace.view).toBe('editor')
    workspace.showHome()
    expect(workspace.view).toBe('home')
    workspace.showTrash()
    expect(workspace.view).toBe('trash')
  })

  it('showDocs 有页签进 editor，无页签回 home', () => {
    const workspace = useWorkspaceStore()
    workspace.showTrash()
    workspace.showDocs(true)
    expect(workspace.view).toBe('editor')
    workspace.showDocs(false)
    expect(workspace.view).toBe('home')
  })
})

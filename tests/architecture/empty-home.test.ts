import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'

const root = resolve(import.meta.dirname, '../..')

function readSrc(rel: string) {
  return readFileSync(resolve(root, rel), 'utf-8')
}

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      collectSourceFiles(full, acc)
      continue
    }
    if (/\.(vue|ts|js)$/.test(entry.name)) acc.push(full)
  }
  return acc
}

const FAKE_PATH = /Documents[/\\]MarkFlow|MarkFlow笔记/

describe('空白首页架构约束', () => {
  it('应存在 EmptyHome 组件与空态文案常量', () => {
    expect(existsSync(resolve(root, 'src/components/EmptyHome.vue'))).toBe(true)
    expect(existsSync(resolve(root, 'src/constants/emptyHomeCopy.ts'))).toBe(true)
    expect(existsSync(resolve(root, 'src/components/OnboardingCoach.vue'))).toBe(true)
  })

  it('侧栏应展示 uTools 本地数据库说明而非伪造路径', () => {
    const sidebar = readSrc('src/components/Sidebar.vue')
    const footer = readSrc('src/components/sidebar/SidebarFooter.vue')
    expect(sidebar + footer).toMatch(/sidebar-storage-caption/)
    expect(sidebar).toMatch(/SIDEBAR_STORAGE_CAPTION/)
  })

  it('App.vue 应挂载 EmptyHome，且无打开 Tab 时不渲染字数', () => {
    const app = readSrc('src/App.vue')
    expect(app).toMatch(/EmptyHome/)
    expect(app).toMatch(/v-if="isEditorView"[\s\S]*status-bar-right|status-bar-right[\s\S]*v-if="isEditorView"/)
  })

  it('首页与空态常量不得出现产品名词「知识库」，且无侧栏开关', () => {
    const copy = readSrc('src/constants/emptyHomeCopy.ts')
    const emptyHome = readSrc('src/components/EmptyHome.vue')
    expect(copy).not.toMatch(/知识库/)
    expect(emptyHome).not.toMatch(/知识库/)
    expect(emptyHome).not.toMatch(/toggleSidebar|empty-home-open-sidebar|openSidebar/)
    expect(emptyHome).toMatch(/empty-home-create-folder/)
    expect(emptyHome).toMatch(/createFolder/)
    expect(copy).toMatch(/EMPTY_HOME_CREATE_FOLDER_LABEL/)
  })

  it('侧栏显隐仅由顶栏汉堡负责，首页不再绑定开关', () => {
    const app = readSrc('src/App.vue')
    const toolbar = readSrc('src/components/Toolbar.vue')
    expect(toolbar).toMatch(/toggleSidebar/)
    expect(app).toMatch(/@toggleSidebar="sidebarVisible = !sidebarVisible"/)
    expect(app).not.toMatch(/:sidebar-visible="sidebarVisible"/)
    expect(app).not.toMatch(/@toggle-sidebar="sidebarVisible = !sidebarVisible"/)
    expect(app).toMatch(/@create-folder=/)
  })

  it('src/constants 与 src/components 不得出现伪造 Documents 路径', () => {
    const files = [
      ...collectSourceFiles(resolve(root, 'src/constants')),
      ...collectSourceFiles(resolve(root, 'src/components')),
    ]
    const offenders = files.filter((file) => FAKE_PATH.test(readFileSync(file, 'utf-8')))
    expect(offenders).toEqual([])
  })
})

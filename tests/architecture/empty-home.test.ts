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

  it('侧栏底栏不再放存储路径 caption', () => {
    const footer = readSrc('src/components/sidebar/SidebarFooter.vue')
    expect(footer).not.toMatch(/sidebar-storage-caption/)
    expect(footer).not.toMatch(/Documents/)
  })

  it('App.vue 应挂载 EmptyHome，且无打开 Tab 时不渲染字数', () => {
    const app = readSrc('src/App.vue')
    expect(app).toMatch(/EmptyHome/)
    expect(app).toMatch(/v-if="isEditorView"[\s\S]*status-bar-right|status-bar-right[\s\S]*v-if="isEditorView"/)
  })

  it('首页不得出现产品名词「知识库」，且无侧栏开关', () => {
    const copy = readSrc('src/constants/emptyHomeCopy.ts')
    const emptyHome = readSrc('src/components/EmptyHome.vue')
    expect(copy).not.toMatch(/知识库/)
    expect(emptyHome).not.toMatch(/知识库/)
    expect(emptyHome).not.toMatch(/toggleSidebar|empty-home-open-sidebar|openSidebar/)
    expect(emptyHome).not.toMatch(/empty-home-create-folder|createFolder/)
    expect(emptyHome).not.toMatch(/empty-home-templates|useTemplate/)
    expect(emptyHome).not.toMatch(/empty-home-import|importExample/)
  })

  it('侧栏显隐仅由顶栏汉堡负责，首页不再绑定开关', () => {
    const app = readSrc('src/App.vue')
    const toolbar = readSrc('src/components/Toolbar.vue')
    expect(toolbar).toMatch(/toggleSidebar/)
    expect(app).toMatch(/@toggleSidebar="sidebarVisible = !sidebarVisible"/)
    expect(app).not.toMatch(/:sidebar-visible="sidebarVisible"/)
    expect(app).not.toMatch(/@toggle-sidebar="sidebarVisible = !sidebarVisible"/)
  })

  it('首页三行命令应对齐新建 / 搜索 / 设置', () => {
    const copy = readSrc('src/constants/emptyHomeCopy.ts')
    const emptyHome = readSrc('src/components/EmptyHome.vue')
    expect(copy).toMatch(/EMPTY_HOME_CREATE_LABEL = '新建文档'/)
    expect(copy).toMatch(/EMPTY_HOME_SEARCH_LABEL = '搜索文档'/)
    expect(copy).toMatch(/EMPTY_HOME_SETTINGS_LABEL = '打开设置'/)
    expect(emptyHome).toMatch(/empty-home-create/)
    expect(emptyHome).toMatch(/empty-home-search/)
    expect(emptyHome).toMatch(/empty-home-settings/)
    expect(emptyHome).toMatch(/empty-home-mark/)
  })

  it('首次打开默认关闭侧栏', () => {
    const storage = readSrc('src/composables/useStorage.ts')
    const app = readSrc('src/App.vue')
    expect(storage).toMatch(/sidebarVisible:\s*false/)
    expect(app).toMatch(/sidebarVisible \?\? false/)
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

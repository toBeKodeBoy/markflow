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
    expect(sidebar).toMatch(/sidebar-storage-caption/)
    expect(sidebar).toMatch(/SIDEBAR_STORAGE_CAPTION/)
  })

  it('App.vue 应挂载 EmptyHome，且无打开 Tab 时不渲染字数', () => {
    const app = readSrc('src/App.vue')
    expect(app).toMatch(/EmptyHome/)
    expect(app).toMatch(/v-if="hasOpenTabs"[\s\S]*status-bar-right|status-bar-right[\s\S]*v-if="hasOpenTabs"/)
  })

  it('空首页侧栏按钮应与汉堡共用 toggle，不得单向打开', () => {
    const app = readSrc('src/App.vue')
    const emptyHome = readSrc('src/components/EmptyHome.vue')
    expect(app).toMatch(/:sidebar-visible="sidebarVisible"/)
    expect(app).toMatch(/@toggle-sidebar="sidebarVisible = !sidebarVisible"/)
    expect(app).not.toMatch(/@open-sidebar="sidebarVisible = true"/)
    expect(emptyHome).toMatch(/toggleSidebar/)
    expect(emptyHome).not.toMatch(/openSidebar/)
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

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'

const root = resolve(import.meta.dirname, '../..')

function readSrc(rel: string) {
  return readFileSync(resolve(root, rel), 'utf-8')
}

function collectVueFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      collectVueFiles(full, acc)
      continue
    }
    if (entry.name.endsWith('.vue')) acc.push(full)
  }
  return acc
}

describe('侧栏壳层架构约束', () => {
  it('应拆出 Brand / Nav / Spaces 组件，Sidebar 只做编排', () => {
    expect(existsSync(resolve(root, 'src/components/sidebar/SidebarBrand.vue'))).toBe(true)
    expect(existsSync(resolve(root, 'src/components/sidebar/SidebarNav.vue'))).toBe(true)
    expect(existsSync(resolve(root, 'src/components/sidebar/SidebarSpaces.vue'))).toBe(true)
    const sidebar = readSrc('src/components/Sidebar.vue')
    expect(sidebar).toMatch(/SidebarBrand|sidebar\/SidebarBrand/)
    expect(sidebar).toMatch(/SidebarNav|sidebar\/SidebarNav/)
    expect(sidebar).toMatch(/SidebarSpaces|sidebar\/SidebarSpaces/)
  })

  it('导航只有首页 / 文档 / 回收站，不得出现知识库或标签入口', () => {
    const nav = readSrc('src/components/sidebar/SidebarNav.vue')
    const copy = readSrc('src/constants/sidebarShell.ts')
    expect(nav).toMatch(/data-testid="sidebar-nav"/)
    expect(copy).toMatch(/SIDEBAR_NAV_HOME = '首页'/)
    expect(copy).toMatch(/SIDEBAR_NAV_DOCS = '文档'/)
    expect(copy).toMatch(/SIDEBAR_NAV_TRASH = '回收站'/)
    expect(nav + copy).not.toMatch(/知识库/)
    expect(nav + copy).not.toMatch(/['"]标签['"]|>标签<|>标签\s/)
  })

  it('Sidebar 与 sidebar 子组件不得出现导航级「知识库」「标签」', () => {
    const files = [
      resolve(root, 'src/components/Sidebar.vue'),
      ...collectVueFiles(resolve(root, 'src/components/sidebar')),
    ]
    const offenders = files.filter((file) => {
      if (!existsSync(file)) return true
      const src = readFileSync(file, 'utf-8')
      return /知识库/.test(src) || /['"]标签['"]/.test(src)
    })
    expect(offenders).toEqual([])
  })

  it('底栏不再保留旧 trash-btn，回收站只走导航', () => {
    const sidebar = readSrc('src/components/Sidebar.vue')
    expect(sidebar).not.toMatch(/class="sidebar-bottom-btn trash-btn"/)
    expect(sidebar).toMatch(/sidebar-storage-caption|SidebarFooter/)
  })

  it('D1：用户可见壳层文案不得再出现「我的文件夹」桶名', () => {
    const files = [
      'src/components/Sidebar.vue',
      'src/components/SidebarTreeRow.vue',
      'src/components/CreateEntryModal.vue',
      'src/constants/sidebarShell.ts',
      'src/constants/exampleLibrary.ts',
      'src/constants/myFolder.ts',
      'src/utils/sidebarTree.ts',
      ...collectVueFiles(resolve(root, 'src/components/sidebar')).map((file) => file.slice(root.length + 1).replace(/\\/g, '/')),
    ]
    const offenders = files.filter((rel) => readSrc(rel).includes('我的文件夹'))
    expect(offenders).toEqual([])
    expect(readSrc('src/utils/sidebarTree.ts')).not.toMatch(/wrapWithMyFolder/)
    expect(readSrc('src/constants/myFolder.ts')).toMatch(/MY_FOLDER_ID/)
    expect(readSrc('src/constants/myFolder.ts')).not.toMatch(/MY_FOLDER_NAME/)
  })

  it('D3：侧栏右键与空态不得再写「新建笔记」', () => {
    const sidebar = readSrc('src/components/Sidebar.vue')
    const copy = readSrc('src/constants/sidebarShell.ts')
    expect(copy).toMatch(/SIDEBAR_CREATE_NOTE_LABEL = '新建文档'/)
    expect(sidebar).toMatch(/SIDEBAR_CREATE_NOTE_LABEL/)
    expect(sidebar).not.toMatch(/>新建笔记</)
    expect(copy).toMatch(/SIDEBAR_EMPTY_TREE = '暂无文档，点击「新建文档」'/)
  })
})

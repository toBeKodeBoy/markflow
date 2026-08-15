import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EmptyHome from '../../../src/components/EmptyHome.vue'
import {
  EMPTY_HOME_TITLE,
  EMPTY_HOME_SUBTITLE,
  EMPTY_HOME_STORAGE_HINT,
  EMPTY_HOME_TEMPLATES_TITLE,
  EMPTY_HOME_EXAMPLE_LIBRARY_LABEL,
  EMPTY_HOME_CREATE_LABEL,
  EMPTY_HOME_CREATE_FOLDER_LABEL,
  EMPTY_HOME_IMPORT_LABEL,
} from '../../../src/constants/emptyHomeCopy'
import { NOTE_TEMPLATES } from '../../../src/constants/noteTemplates'

function mountHome(props?: { emptyLibrary?: boolean }) {
  return mount(EmptyHome, {
    props: {
      emptyLibrary: props?.emptyLibrary ?? true,
    },
  })
}

describe('EmptyHome', () => {
  it('产品标题与主按钮不含知识库，且对齐壳层文案', () => {
    expect(EMPTY_HOME_TITLE).toBe('欢迎使用 MarkFlow')
    expect(EMPTY_HOME_TITLE).not.toContain('知识库')
    expect(EMPTY_HOME_SUBTITLE).not.toContain('知识库')
    expect(EMPTY_HOME_CREATE_LABEL).toBe('新建文档')
    expect(EMPTY_HOME_CREATE_FOLDER_LABEL).toBe('新建文件夹')
    expect(EMPTY_HOME_IMPORT_LABEL).toBe('导入 .md')
    expect(EMPTY_HOME_EXAMPLE_LIBRARY_LABEL).toBe('导入示例笔记')
    expect(EMPTY_HOME_EXAMPLE_LIBRARY_LABEL).not.toContain('知识库')
  })

  it('空库时渲染欢迎文案、存储说明与三个主操作', () => {
    const wrapper = mountHome({ emptyLibrary: true })

    expect(wrapper.find('[data-testid="empty-tabs-state"]').exists()).toBe(true)
    expect(wrapper.text()).toContain(EMPTY_HOME_TITLE)
    expect(wrapper.text()).toContain(EMPTY_HOME_SUBTITLE)
    expect(wrapper.text()).toContain(EMPTY_HOME_STORAGE_HINT)
    expect(wrapper.text()).not.toContain('侧边栏可管理所有文件夹与笔记')
    expect(wrapper.find('[data-testid="empty-home-create"]').text()).toBe(EMPTY_HOME_CREATE_LABEL)
    expect(wrapper.find('[data-testid="empty-home-create-folder"]').text()).toBe(
      EMPTY_HOME_CREATE_FOLDER_LABEL,
    )
    expect(wrapper.find('[data-testid="empty-home-import"]').text()).toBe(EMPTY_HOME_IMPORT_LABEL)
    expect(wrapper.find('[data-testid="empty-home-open-sidebar"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('从侧边栏打开')
    expect(wrapper.text()).not.toContain('收起侧边栏')
    expect(wrapper.text()).not.toContain('知识库')
    expect(wrapper.find('[data-testid="empty-home-templates"]').exists()).toBe(true)
    expect(wrapper.text()).toContain(EMPTY_HOME_TEMPLATES_TITLE)
    expect(wrapper.findAll('[data-testid="empty-home-template-card"]')).toHaveLength(NOTE_TEMPLATES.length)
    expect(wrapper.findAll('[data-testid="empty-home-template-icon"]')).toHaveLength(NOTE_TEMPLATES.length)
    expect(wrapper.findAll('[data-testid="empty-home-hint-icon"]').length).toBeGreaterThanOrEqual(3)
    expect(wrapper.find('[data-testid="empty-home-example-library"]').text()).toContain(
      EMPTY_HOME_EXAMPLE_LIBRARY_LABEL,
    )
  })

  it('点击主按钮发出 create，新建文件夹发出 createFolder，导入发出 import', async () => {
    const wrapper = mountHome()

    await wrapper.find('[data-testid="empty-home-create"]').trigger('click')
    await wrapper.find('[data-testid="empty-home-create-folder"]').trigger('click')
    await wrapper.find('[data-testid="empty-home-import"]').trigger('click')

    expect(wrapper.emitted('create')).toHaveLength(1)
    expect(wrapper.emitted('createFolder')).toHaveLength(1)
    expect(wrapper.emitted('import')).toHaveLength(1)
    expect(wrapper.emitted('toggleSidebar')).toBeUndefined()
  })

  it('点击模板卡发出 useTemplate，点击示例库发出 importExample', async () => {
    const wrapper = mountHome({ emptyLibrary: true })

    await wrapper.findAll('[data-testid="empty-home-template-card"]')[0].trigger('click')
    await wrapper.find('[data-testid="empty-home-example-library"]').trigger('click')

    expect(wrapper.emitted('useTemplate')?.[0]).toEqual([NOTE_TEMPLATES[0].id])
    expect(wrapper.emitted('importExample')).toHaveLength(1)
  })

  it('非空库时仍渲染模板区，但不渲染示例库入口', () => {
    const wrapper = mountHome({ emptyLibrary: false })

    expect(wrapper.find('[data-testid="empty-home-templates"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="empty-home-template-card"]')).toHaveLength(NOTE_TEMPLATES.length)
    expect(wrapper.find('[data-testid="empty-home-example-library"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="empty-home-hints"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="empty-home-recent"]').exists()).toBe(false)
  })
})


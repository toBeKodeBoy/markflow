import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LinkDialog from '../../../src/components/LinkDialog.vue'

function mountDialog(props?: Partial<InstanceType<typeof LinkDialog>['$props']>) {
  return mount(LinkDialog, {
    props: {
      visible: true,
      draft: {
        text: '默认文本',
        url: '',
        title: '',
      },
      ...props,
    },
  })
}

describe('LinkDialog', () => {
  it('打开时应展示链接文本、URL、title 三个输入项', () => {
    const wrapper = mountDialog()

    expect(wrapper.get('[data-testid="link-dialog-text"]').element).toBeTruthy()
    expect(wrapper.get('[data-testid="link-dialog-url"]').element).toBeTruthy()
    expect(wrapper.get('[data-testid="link-dialog-title"]').element).toBeTruthy()
  })

  it('应使用传入 draft 预填表单字段', () => {
    const wrapper = mountDialog({
      draft: {
        text: '项目文档',
        url: 'https://example.com',
        title: '参考资料',
      },
    })

    expect((wrapper.get('[data-testid="link-dialog-text"]').element as HTMLInputElement).value).toBe('项目文档')
    expect((wrapper.get('[data-testid="link-dialog-url"]').element as HTMLInputElement).value).toBe('https://example.com')
    expect((wrapper.get('[data-testid="link-dialog-title"]').element as HTMLInputElement).value).toBe('参考资料')
  })

  it('确认时应透出当前 draft', async () => {
    const wrapper = mountDialog()

    await wrapper.get('[data-testid="link-dialog-text"]').setValue('新链接')
    await wrapper.get('[data-testid="link-dialog-url"]').setValue('https://openai.com')
    await wrapper.get('[data-testid="link-dialog-title"]').setValue('OpenAI')
    await wrapper.get('[data-testid="link-dialog-confirm"]').trigger('click')

    expect(wrapper.emitted('confirm')?.[0]?.[0]).toEqual({
      text: '新链接',
      url: 'https://openai.com',
      title: 'OpenAI',
    })
  })

  it('取消时不应透出 confirm 事件', async () => {
    const wrapper = mountDialog()

    await wrapper.get('[data-testid="link-dialog-cancel"]').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })
})

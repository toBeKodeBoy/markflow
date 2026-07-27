import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HighlightTextModal from '../../../src/components/HighlightTextModal.vue'

function mountModal(props?: Partial<InstanceType<typeof HighlightTextModal>['$props']>) {
  return mount(HighlightTextModal, {
    props: {
      visible: true,
      initialText: '',
      ...props,
    },
  })
}

describe('HighlightTextModal', () => {
  it('renders input when visible', () => {
    const wrapper = mountModal()

    expect(wrapper.find('[data-testid="highlight-text-modal"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="highlight-text-input"]').exists()).toBe(true)
  })

  it('uses initialText to prefill the input', () => {
    const wrapper = mountModal({ initialText: '已有文本' })

    expect((wrapper.get('[data-testid="highlight-text-input"]').element as HTMLInputElement).value).toBe('已有文本')
  })

  it('disables confirm when trimmed input is empty', () => {
    const wrapper = mountModal({ initialText: '   ' })

    expect(wrapper.get('[data-testid="highlight-text-confirm"]').attributes('disabled')).toBeDefined()
  })

  it('emits confirm with trimmed text', async () => {
    const wrapper = mountModal()

    await wrapper.get('[data-testid="highlight-text-input"]').setValue('  重点  ')
    await wrapper.get('[data-testid="highlight-text-confirm"]').trigger('click')

    expect(wrapper.emitted('confirm')?.[0]?.[0]).toBe('重点')
  })

  it('supports Enter to confirm and Escape to cancel', async () => {
    const wrapper = mountModal({ initialText: '重点' })

    await wrapper.get('[data-testid="highlight-text-input"]').trigger('keydown.enter')
    await wrapper.get('[data-testid="highlight-text-input"]').trigger('keydown.escape')

    expect(wrapper.emitted('confirm')?.[0]?.[0]).toBe('重点')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})

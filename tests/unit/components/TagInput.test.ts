import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TagInput from '../../../src/components/TagInput.vue'

describe('TagInput', () => {
  it('renders existing tags', () => {
    const wrapper = mount(TagInput, {
      props: { modelValue: ['API', 'Draft'], suggestions: ['API', 'Work'] },
    })
    expect(wrapper.text()).toContain('API')
    expect(wrapper.text()).toContain('Draft')
  })

  it('emits update when Enter adds a tag', async () => {
    const wrapper = mount(TagInput, {
      props: { modelValue: [], suggestions: [] },
    })
    const input = wrapper.get('input')
    await input.setValue('new-tag')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['new-tag']])
  })

  it('emits update when comma adds a tag', async () => {
    const wrapper = mount(TagInput, {
      props: { modelValue: [], suggestions: [] },
    })
    const input = wrapper.get('input')
    await input.setValue('draft')
    await input.trigger('keydown', { key: ',' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['draft']])
  })

  it('emits update when removing a tag', async () => {
    const wrapper = mount(TagInput, {
      props: { modelValue: ['API'], suggestions: [] },
    })
    await wrapper.get('[data-testid="tag-remove"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[]])
  })

  it('shows suggestions excluding current tags', async () => {
    const wrapper = mount(TagInput, {
      props: { modelValue: ['API'], suggestions: ['API', 'Work'] },
    })
    const input = wrapper.get('input')
    await input.setValue('w')
    await input.trigger('focus')
    expect(wrapper.text()).toContain('Work')
    expect(wrapper.findAll('[data-testid="tag-suggestion"]')).toHaveLength(1)
  })
})

import { describe, it, expect } from 'vitest'
import { tagCloudItemStyle } from '../../../src/composables/useTagCloudLayout'

describe('tagCloudItemStyle', () => {
  it('weight 0 为最小档', () => {
    expect(tagCloudItemStyle(0)).toEqual({
      fontSize: '11px',
      fontWeight: 400,
      opacity: 0.65,
    })
  })

  it('weight 1 为最大档', () => {
    expect(tagCloudItemStyle(1)).toEqual({
      fontSize: '13px',
      fontWeight: 600,
      opacity: 1,
    })
  })

  it('中间 weight 映射到 medium 字重', () => {
    expect(tagCloudItemStyle(0.5).fontWeight).toBe(500)
    expect(tagCloudItemStyle(0.5).fontSize).toBe('12px')
  })

  it('超出范围会被 clamp', () => {
    expect(tagCloudItemStyle(-1).opacity).toBe(0.65)
    expect(tagCloudItemStyle(2).opacity).toBe(1)
  })
})

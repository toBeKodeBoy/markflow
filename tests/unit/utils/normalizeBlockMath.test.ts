/**
 * @file tests/unit/utils/normalizeBlockMath.test.ts
 */
import { describe, it, expect } from 'vitest'
import {
  normalizeBlockMathMarkdown,
  isCurrencyLikeMath,
} from '../../../src/utils/normalizeBlockMath'

describe('normalizeBlockMathMarkdown', () => {
  it('单行 $$...$$ 应规范化为三行', () => {
    const result = normalizeBlockMathMarkdown('$$\\int_0^1 x\\,dx$$')
    expect(result).toBe('$$\n\\int_0^1 x\\,dx\n$$')
  })

  it('已是三行格式时不重复处理', () => {
    const input = '$$\n\\int_0^1 x\\,dx\n$$'
    expect(normalizeBlockMathMarkdown(input)).toBe(input)
  })

  it('段落内其他文本不受影响', () => {
    const input = '前文\n$$E=mc^2$$\n后文'
    expect(normalizeBlockMathMarkdown(input)).toBe('前文\n$$\nE=mc^2\n$$\n后文')
  })
})

describe('isCurrencyLikeMath', () => {
  it('识别货币写法', () => {
    expect(isCurrencyLikeMath('5')).toBe(true)
    expect(isCurrencyLikeMath('E=mc^2')).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import { closeBracketsConfig } from '../../src/extensions/autoCloseBrackets'

describe('autoCloseBrackets', () => {
  it('includes backtick in closeBrackets config for inline code', () => {
    expect(closeBracketsConfig.brackets).toContain('`')
  })
})

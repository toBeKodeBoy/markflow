import { describe, it, expect } from 'vitest'
import { closeBracketsConfig } from '../../src/extensions/autoCloseBrackets'

describe('autoCloseBrackets', () => {
  it('does not auto-close backtick so source mode matches WYSIWYG inline code typing', () => {
    expect(closeBracketsConfig.brackets).not.toContain('`')
  })
})

import { describe, it, expect } from 'vitest'
import {
  INLINE_CODE_DELIMITER,
  INLINE_CODE_PLACEHOLDER,
  buildInlineCodeInsert,
  isInlineCodeMarkdown,
} from '../../src/utils/inlineCode'

describe('inlineCode utils', () => {
  describe('buildInlineCodeInsert', () => {
    it('wraps selected text with single backticks', () => {
      const result = buildInlineCodeInsert('console.log')
      expect(result.insert).toBe('`console.log`')
      expect(result.contentStart).toBe(1)
      expect(result.contentEnd).toBe(12)
    })

    it('uses placeholder when selection is empty', () => {
      const result = buildInlineCodeInsert('')
      expect(result.insert).toBe('`code`')
      expect(result.contentStart).toBe(1)
      expect(result.contentEnd).toBe(1 + INLINE_CODE_PLACEHOLDER.length)
    })

    it('preserves spaces inside inline code', () => {
      const result = buildInlineCodeInsert('a b c')
      expect(result.insert).toBe('`a b c`')
    })
  })

  describe('isInlineCodeMarkdown', () => {
    it('matches single-backtick inline code', () => {
      expect(isInlineCodeMarkdown('`foo`')).toBe(true)
      expect(isInlineCodeMarkdown('text `foo` more')).toBe(true)
    })

    it('does not match fenced code blocks', () => {
      expect(isInlineCodeMarkdown('```js\ncode\n```')).toBe(false)
    })

    it('uses single backtick delimiter constant', () => {
      expect(INLINE_CODE_DELIMITER).toBe('`')
    })
  })
})

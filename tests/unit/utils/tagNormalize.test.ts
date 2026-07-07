import { describe, it, expect } from 'vitest'
import { normalizeTags, normalizeTagInput, TAG_MAX_LENGTH } from '../../../src/utils/tagNormalize'

describe('tagNormalize', () => {
  describe('normalizeTags', () => {
    it('trims whitespace and drops empty strings', () => {
      expect(normalizeTags(['  api  ', '', '  ', 'draft']).tags).toEqual(['api', 'draft'])
    })

    it('deduplicates case-insensitively keeping first casing', () => {
      expect(normalizeTags(['API', 'api', 'Api']).tags).toEqual(['API'])
    })

    it('rejects when any tag exceeds max length', () => {
      const long = 'a'.repeat(TAG_MAX_LENGTH + 1)
      const result = normalizeTags(['ok', long])
      expect(result.tags).toEqual([])
      expect(result.rejected).toBe(long)
    })

    it('accepts tag at exactly max length', () => {
      const exact = 'a'.repeat(TAG_MAX_LENGTH)
      expect(normalizeTags([exact]).tags).toEqual([exact])
    })
  })

  describe('normalizeTagInput', () => {
    it('returns trimmed tag when valid', () => {
      expect(normalizeTagInput('  work  ')).toBe('work')
    })

    it('returns null for empty or overlong input', () => {
      expect(normalizeTagInput('   ')).toBeNull()
      expect(normalizeTagInput('x'.repeat(TAG_MAX_LENGTH + 1))).toBeNull()
    })
  })
})

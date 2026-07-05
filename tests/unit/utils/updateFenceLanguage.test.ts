/**
 * @file tests/unit/utils/updateFenceLanguage.test.ts
 */
import { describe, expect, it } from 'vitest'
import { updateFenceLanguage } from '../../../src/utils/updateFenceLanguage'

describe('updateFenceLanguage', () => {
  it('updates the language of the selected fenced code block', () => {
    const markdown = [
      '```js',
      'console.log(1)',
      '```',
      '',
      '```java',
      'System.out.println(1);',
      '```',
    ].join('\n')

    expect(updateFenceLanguage(markdown, 1, 'python')).toBe([
      '```js',
      'console.log(1)',
      '```',
      '',
      '```python',
      'System.out.println(1);',
      '```',
    ].join('\n'))
  })

  it('adds a language to a code block with no info string', () => {
    const markdown = '```\nplain text\n```'

    expect(updateFenceLanguage(markdown, 0, 'text')).toBe('```text\nplain text\n```')
  })

  it('preserves indentation, fence marker, and trailing info', () => {
    const markdown = '  ~~~java title="Demo"\ncode\n  ~~~'

    expect(updateFenceLanguage(markdown, 0, 'kotlin')).toBe(
      '  ~~~kotlin title="Demo"\ncode\n  ~~~',
    )
  })

  it('removes only the language token when next language is empty', () => {
    const markdown = '```typescript title="Demo"\nconst value = 1\n```'

    expect(updateFenceLanguage(markdown, 0, '')).toBe(
      '```title="Demo"\nconst value = 1\n```',
    )
  })

  it('returns the original markdown when the index is not found', () => {
    const markdown = '```js\nconsole.log(1)\n```'

    expect(updateFenceLanguage(markdown, 2, 'python')).toBe(markdown)
  })
})

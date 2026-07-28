import { describe, expect, it } from 'vitest'
import { normalizeSerializedTaskListMarkdown } from '../../../src/utils/resolveMarkdownAssets'

describe('normalizeSerializedTaskListMarkdown', () => {
  it('normalizes WYSIWYG serialized task markers from * to -', () => {
    const markdown = '* [x] done\n* [ ] todo'

    expect(normalizeSerializedTaskListMarkdown(markdown)).toBe('- [x] done\n- [ ] todo')
  })

  it('removes standalone <br /> placeholders from empty task items', () => {
    const markdown = '* [ ] <br />\n  * [x] <br>'

    expect(normalizeSerializedTaskListMarkdown(markdown)).toBe('- [ ] \n  - [x] ')
  })

  it('does not touch regular bullet lists or existing hyphen task lists', () => {
    const markdown = '* plain item\n- [ ] existing task'

    expect(normalizeSerializedTaskListMarkdown(markdown)).toBe(markdown)
  })

  it('does not rewrite task markers inside fenced code blocks', () => {
    const markdown = [
      '* [ ] outside',
      '```md',
      '* [x] inside fence',
      '* [ ] also inside',
      '```',
      '* [x] after',
      '~~~',
      '* [ ] tilde fence',
      '~~~',
    ].join('\n')

    expect(normalizeSerializedTaskListMarkdown(markdown)).toBe(
      [
        '- [ ] outside',
        '```md',
        '* [x] inside fence',
        '* [ ] also inside',
        '```',
        '- [x] after',
        '~~~',
        '* [ ] tilde fence',
        '~~~',
      ].join('\n')
    )
  })
})

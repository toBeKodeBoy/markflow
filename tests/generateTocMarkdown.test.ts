import { describe, it, expect } from 'vitest'
import {
  TOC_START_MARKER,
  TOC_END_MARKER,
  generateTocMarkdown,
  applyTocToContent,
} from '../src/utils/generateTocMarkdown'

describe('generateTocMarkdown', () => {
  it('returns empty string when document has no headings', () => {
    expect(generateTocMarkdown('plain text\n\nno headings')).toBe('')
  })

  it('generates nested bullet list with anchor links', () => {
    const content = `# Doc Title
## Section A
### Sub A1
## Section B`

    const toc = generateTocMarkdown(content)

    expect(toc).toContain(TOC_START_MARKER)
    expect(toc).toContain(TOC_END_MARKER)
    expect(toc).toContain('## 目录')
    expect(toc).toContain('- [Section A](#section-a)')
    expect(toc).toContain('  - [Sub A1](#sub-a1)')
    expect(toc).toContain('- [Section B](#section-b)')
    expect(toc).not.toContain('Doc Title')
  })

  it('uses plain text for link label when heading has inline markdown', () => {
    const content = '## **Bold** Title'
    const toc = generateTocMarkdown(content, { minLevel: 2 })
    expect(toc).toContain('- [Bold Title](#bold-title)')
  })

  it('assigns duplicate slugs consistently with renderer', () => {
    const content = `## Foo
## Bar
## Foo`
    const toc = generateTocMarkdown(content, { minLevel: 2 })
    expect(toc).toContain('- [Foo](#foo)')
    expect(toc).toContain('- [Bar](#bar)')
    expect(toc).toContain('- [Foo](#foo-1)')
  })

  it('respects minLevel and maxLevel filters', () => {
    const content = `# H1
## H2
### H3
#### H4`
    const toc = generateTocMarkdown(content, { minLevel: 2, maxLevel: 3 })
    expect(toc).toContain('- [H2](#h2)')
    expect(toc).toContain('  - [H3](#h3)')
    expect(toc).not.toContain('H4')
    expect(toc).not.toContain('H1')
  })

  it('supports custom toc title', () => {
    const content = '## Hello'
    const toc = generateTocMarkdown(content, { title: '## Table of Contents', minLevel: 2 })
    expect(toc).toContain('## Table of Contents')
    expect(toc).not.toContain('## 目录')
  })

  it('handles Chinese heading slugs', () => {
    const content = '## 项目介绍\n### 快速开始'
    const toc = generateTocMarkdown(content, { minLevel: 2 })
    expect(toc).toContain('- [项目介绍](#项目介绍)')
    expect(toc).toContain('  - [快速开始](#快速开始)')
  })
})

describe('applyTocToContent', () => {
  it('inserts toc block after document h1 when no existing marker', () => {
    const content = `# My Doc

## First`

    const result = applyTocToContent(content)

    expect(result.indexOf('# My Doc')).toBe(0)
    expect(result).toContain(TOC_START_MARKER)
    expect(result.indexOf(TOC_START_MARKER)).toBeLessThan(result.indexOf('## First'))
  })

  it('prepends toc when document has no h1', () => {
    const content = '## Only Section'
    const result = applyTocToContent(content)
    expect(result.startsWith(TOC_START_MARKER)).toBe(true)
    expect(result).toContain('## Only Section')
  })

  it('replaces existing auto-generated toc block', () => {
    const old = `${TOC_START_MARKER}
## 目录

- Old item
${TOC_END_MARKER}

## New Section`

    const result = applyTocToContent(old)

    expect(result.match(new RegExp(TOC_START_MARKER, 'g'))?.length).toBe(1)
    expect(result).toContain('- [New Section](#new-section)')
    expect(result).not.toContain('- Old item')
  })

  it('returns content unchanged when no headings exist', () => {
    const content = 'no headings here'
    expect(applyTocToContent(content)).toBe(content)
  })
})

describe('parseMarkdown fragment links', () => {
  it('renders toc links with md-fragment-link class', async () => {
    const { parseMarkdown } = await import('../src/utils/markedSetup')
    const html = parseMarkdown('- [Section](#section)\n\n## Section')
    expect(html).toContain('class="md-fragment-link"')
    expect(html).toContain('href="#section"')
    expect(html).toContain('id="section"')
  })
})

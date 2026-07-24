import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseMarkdown, renderListItemContent } from '../src/utils/markedSetup'

const LOOSE_TASK_LIST = `# 任务清单

* [x] 任务1

* [x] 任务2

* [ ] 任务3`

const TIGHT_TASK_LIST = '* [x] done\n* [ ] todo'
const PLAIN_LIST = '* alpha\n* beta'
const MIXED_LIST = '* [x] task\n* plain item'
const LOOSE_MIXED_LIST = '* [x] task\n\n* plain item'

function parseTaskListHtml(markdown: string) {
  const html = parseMarkdown(markdown)
  const doc = new DOMParser().parseFromString(`<div class="markdown-body">${html}</div>`, 'text/html')
  const root = doc.querySelector('.markdown-body')!
  return {
    html,
    ul: root.querySelector('ul'),
    items: [...root.querySelectorAll('li')],
    checkboxes: [...root.querySelectorAll('input[type="checkbox"]')],
  }
}

describe('renderListItemContent', () => {
  it('unwraps single paragraph token for task items via parseInline', () => {
    const paragraphTokens = [{ type: 'checkbox' }, { type: 'text', text: 'a' }]
    const tokens = [{ type: 'paragraph', tokens: paragraphTokens }]
    const parseInline = vi.fn(() => '<input> a')
    const parse = vi.fn(() => '<p><input> a</p>')

    const result = renderListItemContent(parse, parseInline, tokens, true)

    expect(parseInline).toHaveBeenCalledWith(paragraphTokens)
    expect(parse).not.toHaveBeenCalled()
    expect(result).toBe('<input> a')
  })

  it('uses parse for non-task items even when wrapped in paragraph', () => {
    const tokens = [{ type: 'paragraph', tokens: [{ type: 'text', text: 'plain' }] }]
    const parseInline = vi.fn()
    const parse = vi.fn(() => '<p>plain</p>')

    const result = renderListItemContent(parse, parseInline, tokens, false)

    expect(parse).toHaveBeenCalledWith(tokens)
    expect(parseInline).not.toHaveBeenCalled()
    expect(result).toBe('<p>plain</p>')
  })

  it('uses parse for tight task items without paragraph wrapper', () => {
    const tokens = [{ type: 'checkbox' }, { type: 'text', text: 'a' }]
    const parseInline = vi.fn()
    const parse = vi.fn(() => '<input> a')

    const result = renderListItemContent(parse, parseInline, tokens, true)

    expect(parse).toHaveBeenCalledWith(tokens)
    expect(parseInline).not.toHaveBeenCalled()
    expect(result).toBe('<input> a')
  })
})

describe('parseMarkdown task lists (preview pane)', () => {
  it('adds contains-task-list class to task ul', () => {
    const { ul } = parseTaskListHtml(TIGHT_TASK_LIST)
    expect(ul?.classList.contains('contains-task-list')).toBe(true)
  })

  it('adds task-list-item class to each task li', () => {
    const { items } = parseTaskListHtml(TIGHT_TASK_LIST)
    expect(items).toHaveLength(2)
    for (const li of items) {
      expect(li.classList.contains('task-list-item')).toBe(true)
    }
  })

  it('adds task-list-item-checkbox class to checkbox inputs', () => {
    const { checkboxes } = parseTaskListHtml(TIGHT_TASK_LIST)
    expect(checkboxes).toHaveLength(2)
    for (const box of checkboxes) {
      expect(box.classList.contains('task-list-item-checkbox')).toBe(true)
    }
  })

  it('reflects checked state on completed items', () => {
    const { checkboxes } = parseTaskListHtml(TIGHT_TASK_LIST)
    expect(checkboxes[0].hasAttribute('checked')).toBe(true)
    expect(checkboxes[1].hasAttribute('checked')).toBe(false)
  })

  it('does not wrap loose task items in paragraph tags', () => {
    const { html, items } = parseTaskListHtml(LOOSE_TASK_LIST)
    expect(html).not.toMatch(/<li[^>]*>\s*<p>/)
    for (const li of items) {
      expect(li.querySelector('p')).toBeNull()
    }
  })

  it('keeps checkbox and label text in the same list item', () => {
    const { items } = parseTaskListHtml(LOOSE_TASK_LIST)
    expect(items[0].textContent?.trim()).toBe('任务1')
    expect(items[0].querySelector('input[type="checkbox"]')).not.toBeNull()
  })

  it('does not add task classes to plain bullet lists', () => {
    const { ul, items } = parseTaskListHtml(PLAIN_LIST)
    expect(ul?.classList.contains('contains-task-list')).toBe(false)
    for (const li of items) {
      expect(li.classList.contains('task-list-item')).toBe(false)
    }
  })

  it('mixed list only marks task items, not plain siblings', () => {
    const { items } = parseTaskListHtml(MIXED_LIST)
    expect(items).toHaveLength(2)
    expect(items[0].classList.contains('task-list-item')).toBe(true)
    expect(items[1].classList.contains('task-list-item')).toBe(false)
  })

  it('loose mixed list flattens task paragraph without affecting plain item structure', () => {
    const { items } = parseTaskListHtml(LOOSE_MIXED_LIST)
    expect(items[0].classList.contains('task-list-item')).toBe(true)
    expect(items[0].querySelector('p')).toBeNull()
    expect(items[1].classList.contains('task-list-item')).toBe(false)
  })

  it('loose task item with inline formatting renders without paragraph wrapper', () => {
    const { html, items } = parseTaskListHtml('* [x] **bold**\n\n* [ ] next')
    expect(items[0].querySelector('p')).toBeNull()
    expect(items[0].querySelector('strong')?.textContent).toBe('bold')
    expect(html).not.toMatch(/<li class="task-list-item">\s*<p>/)
  })
})

describe('preview task list styles', () => {
  let styleText: string

  beforeEach(() => {
    styleText = readFileSync(resolve(__dirname, '../src/style.css'), 'utf8')
  })

  it('hides markers only on task-list-item, not the entire ul', () => {
    const ulRule = styleText.match(/\.markdown-body\s+ul\.contains-task-list\s*\{[^}]+\}/)?.[0] ?? ''
    expect(ulRule).not.toMatch(/list-style:\s*none/)
    expect(styleText).toMatch(/\.markdown-body\s+li\.task-list-item[\s\S]*list-style-type:\s*none/)
  })

  it('styles task-list-item-checkbox alignment in markdown-body', () => {
    expect(styleText).toMatch(/\.markdown-body\s+\.task-list-item-checkbox/)
  })

  it('uses custom checkbox wrapper with ::before pseudo-element', () => {
    expect(styleText).toMatch(/\.markdown-body\s+\.task-checkbox-wrapper\s*\{[^}]*display:\s*inline-flex[^}]*\}/)
    expect(styleText).toMatch(/\.markdown-body\s+\.task-checkbox-wrapper::before\s*\{[^}]*border:[^}]*\}/)
    expect(styleText).toMatch(/\.markdown-body\s+\.task-checkbox-wrapper:has\(>\s*:checked\)::before/)
  })

  it('hides native checkbox input inside wrapper', () => {
    const checkboxRule = styleText.match(/\.markdown-body\s+\.task-list-item-checkbox\s*\{[^}]+\}/)?.[0] ?? ''
    expect(checkboxRule).toMatch(/opacity:\s*0/)
    expect(checkboxRule).toMatch(/position:\s*absolute/)
  })

  it('uses flex alignment so checkbox and text stay on one row', () => {
    const itemRule = styleText.match(/\.markdown-body\s+li\.task-list-item\s*\{[^}]+\}/)?.[0] ?? ''
    expect(itemRule).toMatch(/display:\s*flex/)
    expect(itemRule).toMatch(/align-items:\s*center/)
  })
})

import { describe, expect, it } from 'vitest'
import { findFootnoteDefTextMatches, findFootnoteRefTextMatches } from '@/plugins/footnoteAutoConvert'
import { Schema } from '@milkdown/prose/model'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
    code_block: { content: 'text*', group: 'block', code: true },
    footnote_reference: {
      group: 'inline',
      inline: true,
      atom: true,
      attrs: { label: { default: '' } },
    },
    footnote_definition: {
      group: 'block',
      content: 'block+',
      attrs: { label: { default: '' } },
    },
  },
})

describe('footnoteAutoConvert matchers', () => {
  it('找到段落中的脚注引用文本', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('正文[^0]结尾')]),
    ])

    expect(findFootnoteRefTextMatches(doc)).toEqual([
      { from: 3, to: 7, label: '0' },
    ])
  })

  it('忽略代码块中的脚注符号', () => {
    const doc = schema.node('doc', null, [
      schema.node('code_block', null, [schema.text('[^a]')]),
    ])

    expect(findFootnoteRefTextMatches(doc)).toEqual([])
  })

  it('找到脚注定义段落', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('[^0]:哈哈')]),
    ])

    const matches = findFootnoteDefTextMatches(doc)
    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({ label: '0', content: '哈哈' })
  })
})

import { describe, expect, it } from 'vitest'
import { annotateFootnoteDisplay, buildFootnoteIndexMap } from '@/plugins/footnoteDisplay'
import { Schema } from '@milkdown/prose/model'

function makeRoot(html: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = html
  return root
}

function makeFootnoteDoc(refs: string[], defs: string[]) {
  const schema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: {
        content: 'inline*',
        group: 'block',
        toDOM: () => ['p', 0],
      },
      text: { group: 'inline' },
      footnote_reference: {
        group: 'inline',
        inline: true,
        atom: true,
        attrs: { label: { default: '' } },
        toDOM: (node) => ['sup', { 'data-type': 'footnote_reference', 'data-label': node.attrs.label }],
      },
      footnote_definition: {
        group: 'block',
        content: 'block+',
        attrs: { label: { default: '' } },
        toDOM: (node) => [
          'dl',
          { 'data-type': 'footnote_definition', 'data-label': node.attrs.label },
          ['dt', node.attrs.label],
          ['dd', 0],
        ],
      },
    },
  })

  const refNodes = refs.map((label) => schema.nodes.footnote_reference!.create({ label }))
  const paragraph = schema.nodes.paragraph!.create(null, refNodes)
  const defNodes = defs.map((label) =>
    schema.nodes.footnote_definition!.create(
      { label },
      schema.nodes.paragraph!.create(null, schema.text(label)),
    ),
  )
  return schema.nodes.doc!.create(null, [paragraph, ...defNodes])
}

describe('annotateFootnoteDisplay', () => {
  it('引用与定义共用首次引用顺序编号', () => {
    const root = makeRoot(`
      <p>先引用 <sup data-type="footnote_reference" data-label="b"></sup>
      再引用 <sup data-type="footnote_reference" data-label="a"></sup></p>
      <dl data-type="footnote_definition" data-label="a"><dt>a</dt><dd>A</dd></dl>
      <dl data-type="footnote_definition" data-label="b"><dt>b</dt><dd>B</dd></dl>
    `)

    annotateFootnoteDisplay(root)

    const refs = root.querySelectorAll<HTMLElement>('sup[data-type="footnote_reference"]')
    const defs = root.querySelectorAll<HTMLElement>('dl[data-type="footnote_definition"]')

    expect(refs[0].dataset.footnoteIndex).toBe('1')
    expect(refs[1].dataset.footnoteIndex).toBe('2')
    expect(defs[0].dataset.footnoteIndex).toBe('2')
    expect(defs[1].dataset.footnoteIndex).toBe('1')
  })

  it('未引用的定义接在已引用编号之后', () => {
    const root = makeRoot(`
      <p>仅引用 <sup data-type="footnote_reference" data-label="a"></sup></p>
      <dl data-type="footnote_definition" data-label="z"><dt>z</dt><dd>Z</dd></dl>
      <dl data-type="footnote_definition" data-label="a"><dt>a</dt><dd>A</dd></dl>
    `)

    annotateFootnoteDisplay(root)

    const defs = root.querySelectorAll<HTMLElement>('dl[data-type="footnote_definition"]')
    expect(defs[0].dataset.footnoteIndex).toBe('2')
    expect(defs[1].dataset.footnoteIndex).toBe('1')
  })
})

describe('buildFootnoteIndexMap', () => {
  it('定义顺序与引用顺序不一致时仍按首次引用编号', () => {
    const doc = makeFootnoteDoc(['b', 'a'], ['a', 'b'])
    const order = buildFootnoteIndexMap(doc)

    expect(order.get('b')).toBe(1)
    expect(order.get('a')).toBe(2)
  })

  it('未引用定义接在已引用编号之后', () => {
    const doc = makeFootnoteDoc(['a'], ['z', 'a'])
    const order = buildFootnoteIndexMap(doc)

    expect(order.get('a')).toBe(1)
    expect(order.get('z')).toBe(2)
  })
})

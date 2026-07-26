import { describe, expect, it } from 'vitest'
import { parseMarkdown } from '../../../src/utils/markedSetup'
import {
  buildFootnoteFallback,
  normalizeFootnoteMarkdownEscapes,
  renderFootnoteSection,
} from '../../../src/utils/footnoteFallback'

describe('parseMarkdown 脚注回退渲染', () => {
  it('将脚注引用渲染为上标并输出脚注区块', () => {
    const markdown = [
      '这里有一个脚注[^a]。',
      '',
      '[^a]: 脚注内容',
    ].join('\n')

    const html = parseMarkdown(markdown)

    expect(html).toContain('<sup')
    expect(html).toContain('href="#fn-1"')
    expect(html).toContain('id="fnref-1"')
    expect(html).toContain('class="footnotes"')
    expect(html).toContain('脚注内容')
    expect(html).not.toContain('[^a]')
  })

  it('按首次引用顺序编号并复用同一脚注编号', () => {
    const markdown = [
      '第二个脚注先出现[^b]，第一个脚注后出现[^a]，再次引用[^b]。',
      '',
      '[^a]: 第一个脚注',
      '[^b]: 第二个脚注',
    ].join('\n')

    const html = parseMarkdown(markdown)

    expect(html).toContain('href="#fn-1"')
    expect(html).toContain('href="#fn-2"')
    expect(html.match(/href="#fn-1"/g)).toHaveLength(2)
    expect(html).toContain('id="fn-1"')
    expect(html).toContain('id="fn-2"')
    expect(html).not.toContain('[^a]')
    expect(html).not.toContain('[^b]')
  })

  it('未定义脚注也不输出原始符号', () => {
    const html = parseMarkdown('缺失定义的脚注[^missing]')

    expect(html).toContain('<sup')
    expect(html).toContain('unresolved')
    expect(html).toContain('missing')
    expect(html).not.toContain('[^missing]')
  })

  it('未定义引用不占用编号，已定义脚注锚点仍对齐', () => {
    const markdown = [
      '先缺定义[^missing]，再引用已定义[^a]。',
      '',
      '[^a]: 有效脚注',
    ].join('\n')

    const html = parseMarkdown(markdown)
    const result = buildFootnoteFallback(markdown, (content) => `<p>${content}</p>`)

    expect(result.content).toContain('@@FNREF:0:0:missing@@')
    expect(result.content).toContain('@@FNREF:1:1:a@@')
    expect(result.footnotes).toEqual([
      { id: 'a', index: 1, content: '<p>有效脚注</p>' },
    ])
    expect(html).toContain('<sup class="footnote-ref unresolved">missing</sup>')
    expect(html).toContain('<sup class="footnote-ref"><a href="#fn-1" id="fnref-1">1</a></sup>')
    expect(html).toContain('id="fn-1"')
    expect(html).toContain('href="#fnref-1"')
    expect(html).not.toContain('href="#fn-2"')
    expect(html).not.toContain('id="fn-2"')
  })

  it('支持多行脚注并保留其中的 Markdown 能力', () => {
    const markdown = [
      '复杂脚注[^long]',
      '',
      '[^long]: 第一行包含 **加粗**',
      '  第二行包含 [链接](https://example.com) 与 `code`',
    ].join('\n')

    const html = parseMarkdown(markdown)

    expect(html).toContain('<strong>加粗</strong>')
    expect(html).toContain('<a href="https://example.com">链接</a>')
    expect(html).toContain('<code>code</code>')
    expect(html).not.toContain('[^long]')
  })

  it('转义后的 \\[^id] 仍渲染为真实上标节点而非字面量 HTML', () => {
    const markdown = [
      '# 脚注语法',
      '',
      '正文\\[^0]',
      '',
      '正文\\[^1]',
      '',
      '\\[^0]:哈哈',
      '\\[^1]:kkj',
    ].join('\n')

    const html = parseMarkdown(markdown)

    expect(html).toContain('<sup class="footnote-ref">')
    expect(html).toContain('href="#fn-1"')
    expect(html).toContain('哈哈')
    expect(html).toContain('kkj')
    expect(html).not.toContain('&lt;sup')
    expect(html).not.toMatch(/>正文&lt;sup/)
    expect(html).not.toContain('\\[^0]')
    expect(html).not.toContain('[^0]')
  })

  it('数字 label 脚注按主流 GFM 语法渲染', () => {
    const html = parseMarkdown('正文[^0]\n\n[^0]:哈哈')

    expect(html).toContain('<sup class="footnote-ref"><a href="#fn-1" id="fnref-1">1</a></sup>')
    expect(html).toContain('哈哈')
    expect(html).not.toContain('[^0]')
  })
})

describe('footnoteFallback', () => {
  it('无脚注时保持原文不变', () => {
    const markdown = '普通内容\n\n```md\n[^a]\n```'
    const result = buildFootnoteFallback(markdown, (content) => `<p>${content}</p>`)

    expect(result.content).toBe(markdown)
    expect(result.footnotes).toEqual([])
  })

  it('纯普通文本走快速返回分支', () => {
    const markdown = '普通内容，没有脚注也没有定义'
    const result = buildFootnoteFallback(markdown, (content) => `<p>${content}</p>`)

    expect(result).toEqual({ content: markdown, footnotes: [] })
  })

  it('不替换代码块与行内代码中的脚注符号，正文使用占位符而非预注入 HTML', () => {
    const markdown = [
      '正文脚注[^a] 与 `inline [^a]`',
      '',
      '```md',
      '[^a] fenced',
      '```',
      '',
      '[^a]: 脚注内容',
    ].join('\n')

    const result = buildFootnoteFallback(markdown, (content) => `<p>${content}</p>`)

    expect(result.content).toContain('@@FNREF:1:1:a@@')
    expect(result.content).not.toContain('<sup')
    expect(result.content).toContain('`inline [^a]`')
    expect(result.content).toContain('```md\n[^a] fenced\n```')
    expect(result.footnotes).toEqual([
      { id: 'a', index: 1, content: '<p>脚注内容</p>' },
    ])
  })

  it('normalizeFootnoteMarkdownEscapes 仅还原脚注转义', () => {
    expect(normalizeFootnoteMarkdownEscapes('正文\\[^0] 与 \\[普通链接](x)')).toBe('正文[^0] 与 \\[普通链接](x)')
    expect(normalizeFootnoteMarkdownEscapes('\\[^0]:内容')).toBe('[^0]:内容')
  })

  it('脚注区块为空时返回空字符串', () => {
    expect(renderFootnoteSection([])).toBe('')
  })

  it('回链 ↩ 注入最后一个段落内部而不是段落外换行', () => {
    const html = renderFootnoteSection([
      { index: 1, content: '<p>第二个脚注内容</p>' },
    ])

    expect(html).toContain('<p>第二个脚注内容 <a href="#fnref-1" class="footnote-backref" title="返回引用" aria-label="返回引用">\u21A9</a></p>')
    expect(html).not.toMatch(/<\/p>\s*<a[^>]*class="footnote-backref"/)
  })

  it('多段落脚注时回链只注入最后一个 p', () => {
    const html = renderFootnoteSection([
      { index: 2, content: '<p>第一段</p>\n<p>第二段</p>' },
    ])

    expect(html).toContain('<p>第一段</p>')
    expect(html).toContain('<p>第二段 <a href="#fnref-2" class="footnote-backref" title="返回引用" aria-label="返回引用">\u21A9</a></p>')
    expect(html).not.toMatch(/第一段 <a[^>]*footnote-backref/)
  })

  it('无 p 标签时回链回退为内容末尾拼接', () => {
    const html = renderFootnoteSection([
      { index: 3, content: '纯文本脚注' },
    ])

    expect(html).toContain('纯文本脚注 <a href="#fnref-3" class="footnote-backref" title="返回引用" aria-label="返回引用">\u21A9</a>')
  })

  it('parseMarkdown 完整链路保留回链字符', () => {
    const html = parseMarkdown('正文[^a]\n\n[^a]: 第二个脚注内容')
    expect(html).toContain('footnote-backref')
    expect(html).toContain('\u21A9')
    expect(html).toMatch(/<p>[^<]*第二个脚注内容\s*<a[^>]*footnote-backref[^>]*>\u21A9<\/a><\/p>/)
  })

  it('多次调用时不受全局正则状态污染', () => {
    const first = buildFootnoteFallback('first[^a]\n\n[^a]: one', (content) => `<p>${content}</p>`)
    const second = buildFootnoteFallback('second[^b]\n\n[^b]: two', (content) => `<p>${content}</p>`)

    expect(first.footnotes[0]).toMatchObject({ id: 'a', index: 1 })
    expect(second.footnotes[0]).toMatchObject({ id: 'b', index: 1 })
  })

  it('支持 tab 缩进与空行续写脚注定义', () => {
    const markdown = [
      '正文[^tab]',
      '',
      '[^tab]: 第一行',
      '',
      '\t第二行',
      '  第三行',
    ].join('\n')

    const result = buildFootnoteFallback(markdown, (content) => `<p>${content.replace(/\n/g, '|')}</p>`)

    expect(result.footnotes).toEqual([
      { id: 'tab', index: 1, content: '<p>第一行||第二行|第三行</p>' },
    ])
  })

  it('不把代码块内的 [^id]: 行当作脚注定义剥离', () => {
    const markdown = [
      '正文引用[^real]。',
      '',
      '```md',
      '[^sample]: 示例定义不应被剥离',
      '正文[^sample]',
      '```',
      '',
      '[^real]: 真实脚注',
    ].join('\n')

    const result = buildFootnoteFallback(markdown, (content) => `<p>${content}</p>`)
    const html = parseMarkdown(markdown)

    expect(result.content).toContain('```md\n[^sample]: 示例定义不应被剥离\n正文[^sample]\n```')
    expect(result.footnotes).toEqual([
      { id: 'real', index: 1, content: '<p>真实脚注</p>' },
    ])
    expect(html).toContain('language-md')
    expect(html).toContain('示例定义不应被剥离')
    expect(html).toContain('真实脚注')
    // 示例定义只应出现在代码高亮区，不应成为文末脚注条目
    expect(html).not.toMatch(/id="fn-2"/)
    expect(html.match(/示例定义不应被剥离/g)).toHaveLength(1)
  })

  it('未引用的脚注定义仍进入文末区块，编号接在已引用之后', () => {
    const markdown = [
      '只引用了 a[^a]。',
      '',
      '[^b]: 未引用定义',
      '[^a]: 已引用定义',
    ].join('\n')

    const result = buildFootnoteFallback(markdown, (content) => `<p>${content}</p>`)
    const html = parseMarkdown(markdown)

    expect(result.footnotes).toEqual([
      { id: 'a', index: 1, content: '<p>已引用定义</p>' },
      { id: 'b', index: 2, content: '<p>未引用定义</p>' },
    ])
    expect(html).toContain('id="fn-1"')
    expect(html).toContain('id="fn-2"')
    expect(html).toContain('已引用定义')
    expect(html).toContain('未引用定义')
  })

  it('label 含 @ 时占位符仍能还原为上标', () => {
    const markdown = [
      '邮箱脚注[^user@host]。',
      '',
      '[^user@host]: 含 at 的定义',
    ].join('\n')

    const result = buildFootnoteFallback(markdown, (content) => `<p>${content}</p>`)
    const html = parseMarkdown(markdown)

    expect(result.content).toMatch(/@@FNREF:1:1:[^@]+@@/)
    expect(result.content).not.toContain('@@FNREF:1:1:user@host@@')
    expect(result.footnotes).toEqual([
      { id: 'user@host', index: 1, content: '<p>含 at 的定义</p>' },
    ])
    expect(html).toContain('<sup class="footnote-ref"><a href="#fn-1" id="fnref-1">1</a></sup>')
    expect(html).toContain('含 at 的定义')
    expect(html).not.toContain('@@FNREF:')
    expect(html).not.toContain('[^user@host]')
  })
})

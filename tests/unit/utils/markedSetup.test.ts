/**
 * @file tests/unit/utils/markedSetup.test.ts
 */
import { describe, it, expect } from 'vitest'
import { parseMarkdown } from '../../../src/utils/markedSetup'

describe('parseMarkdown', () => {
  it('应渲染基础 Markdown', () => {
    const html = parseMarkdown('# Hello')
    expect(html).toContain('<h1')
    expect(html).toContain('Hello')
  })

  it('代码块应包含复制按钮', () => {
    const html = parseMarkdown('```js\nconsole.log(1)\n```')
    expect(html).toContain('code-copy-btn')
    expect(html).toContain('code-block-wrapper')
  })

  it('预览代码块应渲染语言标签与高亮 class', () => {
    const html = parseMarkdown([
      '```js',
      'console.log(1)',
      '```',
      '',
      '```java',
      'System.out.println(1);',
      '```',
    ].join('\n'))

    expect(html).toContain('code-lang-label">js</span>')
    expect(html).toContain('code-lang-label">java</span>')
    expect(html).toContain('language-js')
    expect(html).toContain('language-java')
  })

  it('应转义代码块语言标签中的 HTML', () => {
    const html = parseMarkdown('```<script>alert(1)</script>\ncode\n```')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('应剥离 Markdown 中的 script 标签', () => {
    const html = parseMarkdown('<script>alert("xss")</script>\n\n# Safe')
    expect(html).not.toContain('<script')
    expect(html).toContain('Safe')
  })

  it('应支持 ==高亮== 语法', () => {
    const html = parseMarkdown('==highlight==')
    expect(html).toContain('highlight-mark')
    expect(html).toContain('highlight')
  })

  it('图片应渲染 scale class 并居中', () => {
    const html = parseMarkdown('![图](https://example.com/a.png "scale:50")')
    expect(html).toContain('markflow-img-scale-50')
    expect(html).toContain('data-scale="50"')
  })

  it('标题应注入 id 供锚点跳转', () => {
    const html = parseMarkdown('## Docker 核心概念与环境安装\n\n正文')
    expect(html).toContain('id="docker-核心概念与环境安装"')
    expect(html).toContain('<h2')
  })

  it('目录锚点链接应与标题 id 匹配', () => {
    const md = [
      '## 目录',
      '',
      '1. [Docker 核心概念与环境安装](#docker-核心概念与环境安装)',
      '',
      '## Docker 核心概念与环境安装',
      '',
      'content',
    ].join('\n')

    const html = parseMarkdown(md)
    expect(html).toContain('href="#docker-核心概念与环境安装"')
    expect(html).toContain('id="docker-核心概念与环境安装"')
  })

  it('重复标题 id 应自动去重', () => {
    const html = parseMarkdown('## Same\n\n## Same\n')
    expect(html).toContain('id="same"')
    expect(html).toContain('id="same-1"')
  })
})

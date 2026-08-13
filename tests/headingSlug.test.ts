import { describe, it, expect } from 'vitest'
import { HeadingSlugger, plainHeadingText, slugifyHeading } from '../src/utils/headingSlug'

describe('plainHeadingText', () => {
  it('strips inline markdown from heading text', () => {
    expect(plainHeadingText('**Bold** and `code`')).toBe('Bold and code')
  })

  // 剥离单星号斜体
  it('strips single asterisk italic', () => {
    expect(plainHeadingText('*italic*')).toBe('italic')
  })

  // 剥离双下划线粗体（Felix 新增的 __ 处理）
  it('strips double underscore bold', () => {
    expect(plainHeadingText('__bold__')).toBe('bold')
  })

  // 剥离单下划线斜体
  it('strips single underscore italic', () => {
    expect(plainHeadingText('_italic_')).toBe('italic')
  })

  // 剥离链接，保留链接文本
  it('strips link keeping link text', () => {
    expect(plainHeadingText('[Google](https://google.com)')).toBe('Google')
  })

  // 去除首尾空白
  it('trims surrounding whitespace', () => {
    expect(plainHeadingText('  Hello  ')).toBe('Hello')
  })

  // 混合多种内联标记一并剥离
  it('strips mixed inline marks', () => {
    expect(plainHeadingText('**A** *B* __C__ _D_ `E` [F](url)')).toBe('A B C D E F')
  })
})

describe('slugifyHeading', () => {
  it('lowercases latin and keeps CJK', () => {
    expect(slugifyHeading('Docker 核心概念')).toBe('docker-核心概念')
  })

  it('keeps pure CJK heading as slug', () => {
    expect(slugifyHeading('项目介绍')).toBe('项目介绍')
  })

  // 移除特殊符号（!、? 等）
  it('removes special characters', () => {
    expect(slugifyHeading('Hello!!! World???')).toBe('hello-world')
  })

  // 折叠连续连字符
  it('collapses multiple hyphens', () => {
    expect(slugifyHeading('A--B  C')).toBe('a-b-c')
  })

  // 去除首尾连字符
  it('trims leading and trailing hyphens', () => {
    expect(slugifyHeading('--Trim Me--')).toBe('trim-me')
  })

  // 保留数字
  it('keeps digits', () => {
    expect(slugifyHeading('Chapter 12')).toBe('chapter-12')
  })

  // 纯特殊字符生成空 slug
  it('returns empty string for only special characters', () => {
    expect(slugifyHeading('!!!')).toBe('')
  })
})

describe('HeadingSlugger', () => {
  it('deduplicates repeated headings with numeric suffix', () => {
    const slugger = new HeadingSlugger()
    expect(slugger.slug('Foo')).toBe('foo')
    expect(slugger.slug('Bar')).toBe('bar')
    expect(slugger.slug('Foo')).toBe('foo-1')
  })

  it('resets between parse passes', () => {
    const slugger = new HeadingSlugger()
    slugger.slug('Foo')
    slugger.reset()
    expect(slugger.slug('Foo')).toBe('foo')
  })

  // 空 slug 回退为 section（覆盖 if (!base) 的 true 分支）
  it('falls back to section when slug is empty', () => {
    const slugger = new HeadingSlugger()
    expect(slugger.slug('!!!')).toBe('section')
  })

  // 连续空标题去重为 section、section-1
  it('deduplicates empty-slug headings with numeric suffix', () => {
    const slugger = new HeadingSlugger()
    expect(slugger.slug('!!!')).toBe('section')
    expect(slugger.slug('???')).toBe('section-1')
  })
})

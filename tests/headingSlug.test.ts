import { describe, it, expect } from 'vitest'
import { HeadingSlugger, plainHeadingText, slugifyHeading } from '../src/utils/headingSlug'

describe('plainHeadingText', () => {
  it('strips inline markdown from heading text', () => {
    expect(plainHeadingText('**Bold** and `code`')).toBe('Bold and code')
  })
})

describe('slugifyHeading', () => {
  it('lowercases latin and keeps CJK', () => {
    expect(slugifyHeading('Docker 核心概念')).toBe('docker-核心概念')
  })

  it('keeps pure CJK heading as slug', () => {
    expect(slugifyHeading('项目介绍')).toBe('项目介绍')
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
})

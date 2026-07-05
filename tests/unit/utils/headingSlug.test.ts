import { describe, expect, it } from 'vitest'
import { HeadingSlugger, slugifyHeading } from '../../../src/utils/headingSlug'

describe('slugifyHeading', () => {
  it('handles Chinese headings', () => {
    expect(slugifyHeading('项目介绍')).toBe('项目介绍')
  })

  it('handles mixed Chinese and Latin', () => {
    expect(slugifyHeading('Docker 核心概念与环境安装')).toBe('docker-核心概念与环境安装')
  })

  it('lowercases Latin and replaces spaces', () => {
    expect(slugifyHeading('常见问题 FAQ')).toBe('常见问题-faq')
  })

  it('strips inline markdown markers', () => {
    expect(slugifyHeading('**Bold** title')).toBe('bold-title')
  })
})

describe('HeadingSlugger', () => {
  it('deduplicates identical headings', () => {
    const slugger = new HeadingSlugger()
    expect(slugger.slug('Intro')).toBe('intro')
    expect(slugger.slug('Intro')).toBe('intro-1')
    expect(slugger.slug('Intro')).toBe('intro-2')
  })

  it('resets between documents', () => {
    const slugger = new HeadingSlugger()
    slugger.slug('Intro')
    slugger.reset()
    expect(slugger.slug('Intro')).toBe('intro')
  })
})

import { parseHeadings, type TocHeading } from '../composables/useTocHeadings'
import { HeadingSlugger, plainHeadingText } from './headingSlug'

export const TOC_START_MARKER = '<!-- markflow-toc -->'
export const TOC_END_MARKER = '<!-- /markflow-toc -->'

export interface GenerateTocOptions {
  /** 目录块标题行，默认 `## 目录` */
  title?: string
  /** 最低标题级别 (1–6)，默认 2（跳过文档 H1） */
  minLevel?: number
  /** 最高标题级别 (1–6)，默认 6 */
  maxLevel?: number
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 去掉已有 markflow 目录块，避免把「## 目录」重复计入 */
function stripExistingTocBlock(content: string): string {
  const blockRegex = new RegExp(
    `${escapeRegExp(TOC_START_MARKER)}[\\s\\S]*?${escapeRegExp(TOC_END_MARKER)}\\n?`,
    'gm'
  )
  return content.replace(blockRegex, '')
}

function parseTocTitleLine(title: string): { level: number; text: string } | null {
  const m = title.match(/^(#{1,6})\s+(.+)/)
  if (!m) return null
  return { level: m[1].length, text: m[2].trim() }
}

/** 同一 level+text 在列表中的第 n 次出现（0-based） */
function headingOccurrence(headings: TocHeading[], target: TocHeading): number {
  let n = 0
  for (const h of headings) {
    if (h.level === target.level && h.text === target.text) {
      if (h.index === target.index) return n
      n++
    }
  }
  return 0
}

/** 与 marked / WYSIWYG headingId 一致：按文档顺序为标题分配 slug */
function assignHeadingSlugs(content: string): string[] {
  const headings = parseHeadings(content)
  const slugger = new HeadingSlugger()
  return headings.map((h) => slugger.slug(h.text))
}

/** 在 stripped 文档中插入目录块（与 applyTocToContent 插入位置一致） */
function insertTocBlockIntoContent(stripped: string, tocBlock: string): string {
  const firstLineMatch = stripped.match(/^#\s+.+\n?/)
  if (firstLineMatch) {
    const insertPos = firstLineMatch[0].length
    const before = stripped.slice(0, insertPos)
    const after = stripped.slice(insertPos).replace(/^\n+/, '\n\n')
    const gap = before.endsWith('\n') ? '' : '\n'
    return `${before}${gap}${tocBlock}${after}`
  }

  if (!stripped) return tocBlock
  return `${tocBlock}\n\n${stripped}`
}

/** 在模拟文档中查找第 occurrence 次匹配的标题 slug */
function slugAtOccurrence(
  simulatedHeadings: TocHeading[],
  simulatedSlugs: string[],
  level: number,
  text: string,
  occurrence: number
): string {
  let n = 0
  for (let i = 0; i < simulatedHeadings.length; i++) {
    const h = simulatedHeadings[i]
    if (h.level === level && h.text === text) {
      if (n === occurrence) return simulatedSlugs[i]
      n++
    }
  }
  return new HeadingSlugger().slug(text)
}

/**
 * 正文标题在插入目录块后的 slug：目录块标题行占用同名 slug 的第一个序号。
 */
function resolveSlugForHeading(
  strippedHeadings: TocHeading[],
  heading: TocHeading,
  simulatedHeadings: TocHeading[],
  simulatedSlugs: string[],
  tocTitle: { level: number; text: string } | null
): string {
  let occurrence = headingOccurrence(strippedHeadings, heading)
  if (
    tocTitle
    && heading.level === tocTitle.level
    && heading.text === tocTitle.text
  ) {
    occurrence += 1
  }
  return slugAtOccurrence(simulatedHeadings, simulatedSlugs, heading.level, heading.text, occurrence)
}

/** 根据文档标题生成 Markdown 目录块（页内锚点链接，预览内可跳转） */
export function generateTocMarkdown(content: string, options: GenerateTocOptions = {}): string {
  const { title = '## 目录', minLevel = 2, maxLevel = 6 } = options

  const stripped = stripExistingTocBlock(content)
  const headings = parseHeadings(stripped)
  if (headings.length === 0) return ''

  const filtered = headings.filter((h) => h.level >= minLevel && h.level <= maxLevel)
  if (filtered.length === 0) return ''

  const tocShell = [TOC_START_MARKER, title, '', TOC_END_MARKER, ''].join('\n')
  const simulated = insertTocBlockIntoContent(stripped, tocShell)
  const simulatedHeadings = parseHeadings(simulated)
  const simulatedSlugs = assignHeadingSlugs(simulated)
  const tocTitle = parseTocTitleLine(title)

  const baseLevel = Math.min(...filtered.map((h) => h.level))

  const lines = filtered.map((h) => {
    const slug = resolveSlugForHeading(
      headings,
      h,
      simulatedHeadings,
      simulatedSlugs,
      tocTitle
    )
    const indent = '  '.repeat(h.level - baseLevel)
    const label = plainHeadingText(h.text)
    return `${indent}- [${label}](#${slug})`
  })

  return [TOC_START_MARKER, title, '', ...lines, TOC_END_MARKER, ''].join('\n')
}

/** 将目录块插入文档（已有 markflow 目录块则替换） */
export function applyTocToContent(content: string, options?: GenerateTocOptions): string {
  const tocBlock = generateTocMarkdown(content, options)
  if (!tocBlock) return content

  const blockRegex = new RegExp(
    `${escapeRegExp(TOC_START_MARKER)}[\\s\\S]*?${escapeRegExp(TOC_END_MARKER)}\\n?`,
    'm'
  )

  if (blockRegex.test(content)) {
    return content.replace(blockRegex, tocBlock)
  }

  const stripped = stripExistingTocBlock(content)
  return insertTocBlockIntoContent(stripped, tocBlock)
}

const FOOTNOTE_DEF_RE = /^\[\^([^\]\s]+)\]:[ \t]*(.*)$/
const FOOTNOTE_REF_RE = /\[\^([^\]\s]+)\]/g
const FOOTNOTE_REF_TEST_RE = /\[\^([^\]\s]+)\]/
const FENCE_LINE_RE = /^(`{3,}|~{3,})/
const FENCED_BLOCK_RE = /(```[\s\S]*?```|~~~[\s\S]*?~~~)/g
const INLINE_CODE_RE = /(`[^`\n]+`)/g
/** 仅还原脚注引用/定义前的 `\[`，不影响普通链接转义 */
const FOOTNOTE_ESCAPE_RE = /\\(\[\^[^\]\s]+\])/g
const PLACEHOLDER_RE = /@@FNREF:(\d+):([01]):([^@]+)@@/g

export interface FootnoteTransformResult {
  content: string
  footnotes: Array<{ id: string; index: number; content: string }>
}

function appendContinuation(buffer: string[], line: string) {
  if (/^\t/.test(line)) {
    buffer.push(line.slice(1))
    return
  }
  buffer.push(line.slice(2))
}

/** 还原被序列化转义的脚注语法：`\[^id]` → `[^id]` */
export function normalizeFootnoteMarkdownEscapes(markdown: string): string {
  return markdown.replace(FOOTNOTE_ESCAPE_RE, '$1')
}

function collectFootnoteDefinitions(markdown: string): { body: string; definitions: Map<string, string> } {
  const lines = markdown.split('\n')
  const definitions = new Map<string, string>()
  const body: string[] = []
  let fenceMarker: string | null = null

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const fenceMatch = FENCE_LINE_RE.exec(line)

    if (fenceMarker) {
      body.push(line)
      if (fenceMatch && line.startsWith(fenceMarker) && /^[`~]*\s*$/.test(line.slice(fenceMarker.length))) {
        fenceMarker = null
      }
      continue
    }

    if (fenceMatch) {
      fenceMarker = fenceMatch[1]
      body.push(line)
      continue
    }

    const match = FOOTNOTE_DEF_RE.exec(line)
    if (!match) {
      body.push(line)
      continue
    }

    const [, id, firstLine] = match
    const buffer = [firstLine]
    let cursor = i + 1
    let sawContinuation = false

    while (cursor < lines.length) {
      const nextLine = lines[cursor]
      if (/^(?: {2,}|\t)/.test(nextLine)) {
        appendContinuation(buffer, nextLine)
        sawContinuation = true
        cursor += 1
        continue
      }
      if (nextLine === '' && /^(?: {2,}|\t)/.test(lines[cursor + 1] ?? '')) {
        buffer.push('')
        cursor += 1
        sawContinuation = true
        continue
      }
      break
    }

    definitions.set(id, buffer.join('\n').trimEnd())
    i = sawContinuation ? cursor - 1 : i
  }

  return { body: body.join('\n'), definitions }
}

function makePlaceholder(index: number, resolved: boolean, id: string): string {
  // encodeURIComponent 去掉 @ 等分隔冲突字符，materialize 时再 decode
  return `@@FNREF:${index}:${resolved ? '1' : '0'}:${encodeURIComponent(id)}@@`
}

function replaceRefs(segment: string, definitions: Map<string, string>, order: string[]): string {
  return segment.replace(FOOTNOTE_REF_RE, (_, rawId: string) => {
    const id = rawId.trim()
    // 未定义引用不占编号，避免文末列表重编号后锚点错位
    if (!definitions.has(id)) {
      return makePlaceholder(0, false, id)
    }

    let index = order.indexOf(id) + 1
    if (index === 0) {
      order.push(id)
      index = order.length
    }

    return makePlaceholder(index, true, id)
  })
}

function transformRefs(markdown: string, definitions: Map<string, string>, order: string[]): string {
  return markdown
    .split(FENCED_BLOCK_RE)
    .map((fencedPart, fencedIndex) => {
      if (fencedIndex % 2 === 1) return fencedPart
      return fencedPart
        .split(INLINE_CODE_RE)
        .map((inlinePart, inlineIndex) => (inlineIndex % 2 === 1
          ? inlinePart
          : replaceRefs(inlinePart, definitions, order)))
        .join('')
    })
    .join('')
}

/**
 * 将脚注引用换成占位符（避免把 HTML 塞进 markdown 再 parse 被转义），
 * 定义抽出后由 renderFootnoteSection / materializeFootnotePlaceholders 还原。
 */
export function buildFootnoteFallback(
  markdown: string,
  renderMarkdown: (content: string) => string,
): FootnoteTransformResult {
  const normalized = normalizeFootnoteMarkdownEscapes(markdown)
  const { body, definitions } = collectFootnoteDefinitions(normalized)
  if (definitions.size === 0 && !FOOTNOTE_REF_TEST_RE.test(normalized)) {
    return { content: markdown, footnotes: [] }
  }

  const order: string[] = []
  const content = transformRefs(body, definitions, order)
  // 先按首次引用编号，未引用定义接在后面（与 WYSIWYG buildFootnoteIndexMap 一致）
  const footnoteIds = [
    ...order,
    ...[...definitions.keys()].filter((id) => !order.includes(id)),
  ]
  const footnotes = footnoteIds.map((id, idx) => ({
    id,
    index: idx + 1,
    content: renderMarkdown(definitions.get(id) ?? '').trim(),
  }))

  return { content, footnotes }
}

export function renderFootnoteSection(footnotes: Array<{ index: number; content: string }>): string {
  if (footnotes.length === 0) return ''
  const items = footnotes
    .map(({ index, content }) => {
      const backref = ` <a href="#fnref-${index}" class="footnote-backref" title="返回引用" aria-label="返回引用">\u21A9</a>`
      return `<li id="fn-${index}"><div class="footnote-content">${appendFootnoteBackref(content, backref)}</div></li>`
    })
    .join('')
  return `<section class="footnotes" data-footnotes><ol>${items}</ol></section>`
}

/** 将回链插入最后一个 </p> 之前，避免块级段落导致 ↩ 换行 */
export function appendFootnoteBackref(content: string, backref: string): string {
  const trimmed = content.trimEnd()
  const lastClose = trimmed.lastIndexOf('</p>')
  if (lastClose === -1) return `${trimmed}${backref}`
  return `${trimmed.slice(0, lastClose)}${backref}</p>${trimmed.slice(lastClose + 4)}`
}

/** 将 marked 输出中的脚注占位符替换为真实 <sup> HTML */
export function materializeFootnotePlaceholders(html: string): string {
  return html.replace(PLACEHOLDER_RE, (_, index: string, resolved: string, encodedId: string) => {
    const id = decodeURIComponent(encodedId)
    if (resolved === '1') {
      return `<sup class="footnote-ref"><a href="#fn-${index}" id="fnref-${index}">${index}</a></sup>`
    }
    return `<sup class="footnote-ref unresolved">${id}</sup>`
  })
}

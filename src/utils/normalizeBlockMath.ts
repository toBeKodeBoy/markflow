/**
 * remark-math 要求块级 $$ 独占行；将单行 $$...$$ 规范化为三行格式。
 * marked 扩展已支持单行，规范化后两者行为一致。
 */
export function normalizeBlockMathMarkdown(md: string): string {
  return md.replace(/^(\s*)\$\$([^\n]+?)\$\$(\s*)$/gm, (_match, lead, inner, trail) => {
    const body = String(inner).trim()
    if (!body) return _match
    return `${lead}$$\n${body}\n$$${trail}`
  })
}

/** 行内公式是否为货币写法（如 $5） */
export function isCurrencyLikeMath(content: string): boolean {
  return /^\d/.test(content.trim())
}

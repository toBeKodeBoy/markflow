/** 行内代码 Markdown 分隔符（单个反引号） */
export const INLINE_CODE_DELIMITER = '`'

/** 无选区时插入的占位文本 */
export const INLINE_CODE_PLACEHOLDER = 'code'

export interface InlineCodeInsertResult {
  insert: string
  /** 相对 insert 字符串起始的内容选区起点 */
  contentStart: number
  /** 相对 insert 字符串起始的内容选区终点 */
  contentEnd: number
}

/** 构建行内代码 Markdown 片段及内容选区（用于工具栏/快捷键插入） */
export function buildInlineCodeInsert(selected: string): InlineCodeInsertResult {
  const content = selected || INLINE_CODE_PLACEHOLDER
  const insert = `${INLINE_CODE_DELIMITER}${content}${INLINE_CODE_DELIMITER}`
  return {
    insert,
    contentStart: INLINE_CODE_DELIMITER.length,
    contentEnd: INLINE_CODE_DELIMITER.length + content.length,
  }
}

/** 判断文本是否包含行内代码（排除纯围栏代码块场景） */
export function isInlineCodeMarkdown(text: string): boolean {
  return /`[^`\n]+`/.test(text)
}

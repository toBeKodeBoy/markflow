/**
 * 剥离内联 Markdown 语法标记，仅保留纯文本内容。
 * 用于标题展示场景（Tab/侧栏/搜索/TOC），避免语法符号残留。
 * 剥离后若结果为空字符串，回退返回原始输入文本。
 * @param text 待剥离的标题文本
 * @returns 剥离内联语法后的纯文本；剥离后为空则回退原文
 */
export function stripInlineMarkdown(text: string): string {
  // 空值 / 空字符串直接返回，避免后续无意义处理
  if (!text) return text

  let result = text
  // 1. 图片 ![alt](url) -> alt
  result = result.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  // 2. 链接 [text](url) -> text
  result = result.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  // 3. 行内代码 `code` -> code
  result = result.replace(/`([^`]+)`/g, '$1')
  // 4. 加粗+斜体 ***text*** -> text
  result = result.replace(/\*{3}(.+?)\*{3}/g, '$1')
  // 5. 加粗 **text** -> text
  result = result.replace(/\*{2}(.+?)\*{2}/g, '$1')
  // 6. 斜体 *text* -> text
  //    内容用 [^*]+ 约束（不含星号），避免误匹配纯星号串如 ****，
  //    使其原样保留并在剥离后为空时回退原文
  result = result.replace(/\*([^*]+)\*/g, '$1')
  // 7. 下划线加粗 __text__ -> text（须在下划线斜体前，避免误匹配）
  result = result.replace(/__(.+?)__/g, '$1')
  // 8. 下划线斜体 _text_ -> text
  result = result.replace(/_(.+?)_/g, '$1')
  // 9. 删除线 ~~text~~ -> text
  result = result.replace(/~~(.+?)~~/g, '$1')
  // 10. 高亮 ==text== -> text
  result = result.replace(/==(.+?)==/g, '$1')
  // 11. HTML 标签 -> 空（仅匹配真实 HTML 标签：`<` 后须紧跟字母/`/`/`!`，
  //     避免误剥数学比较符尖括号如 `x < 5 且 y > 3`）
  const hadHtml = /<[a-zA-Z!/][^>]*>/.test(result)
  result = result.replace(/<[a-zA-Z!/][^>]*>/g, '')
  // 清理多余空白
  result = result.replace(/\s+/g, ' ').trim()
  // 剥离后为空时：原文含真实 HTML 标签则返回空，否则回退原文
  return result || (hadHtml ? '' : text)
}

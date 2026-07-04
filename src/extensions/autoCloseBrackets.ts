import { closeBrackets } from '@codemirror/autocomplete'
import { markdown } from '@codemirror/lang-markdown'

/**
 * markdown() 每次会创建独立 Language 实例；
 * closeBrackets 的 languageData 必须挂到该实例，不能挂到 markdownLanguage 静态对象。
 */
export const markdownEditorSupport = markdown()

export const closeBracketsConfig = {
  brackets: ['(', '{', '`'],
} as const

const autoCloseBracketsLanguageData = markdownEditorSupport.language.data.of({
  closeBrackets: closeBracketsConfig,
})

/** CodeMirror 扩展：输入 ( / { 时自动补全对应右括号（含 markdown 语言包） */
export const autoCloseBracketsExtensions = [
  markdownEditorSupport,
  closeBrackets(),
  autoCloseBracketsLanguageData,
]

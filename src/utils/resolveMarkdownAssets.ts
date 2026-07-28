import { getAssetStorage } from '../composables/useAssetStorage'
import { resolveAssetsInMarkdown, restoreAssetRefsInMarkdown, ASSET_ID_SCAN_RE } from './assetUri'

const SERIALIZED_TASK_ITEM_RE = /^(\s*)\* \[([ xX])\](?:\s+(.*))?$/i
const FENCE_LINE_RE = /^\s*(```|~~~)/

export function normalizeSerializedTaskListMarkdown(markdown: string): string {
  let inFence = false
  return markdown
    .split(/\r?\n/)
    .map((line) => {
      if (FENCE_LINE_RE.test(line)) {
        inFence = !inFence
        return line
      }
      if (inFence) return line

      const match = SERIALIZED_TASK_ITEM_RE.exec(line)
      if (!match) return line

      const indent = match[1] ?? ''
      const checked = match[2] ?? ' '
      const rawText = match[3] ?? ''
      const text = /^<br\s*\/?>$/i.test(rawText) ? '' : rawText
      return `${indent}- [${checked}]${text ? ` ${text}` : ' '}`
    })
    .join('\n')
}

/** 预加载 Markdown 中引用的 asset，再解析为可渲染的 data URL */
export async function resolveMarkdownForDisplay(markdown: string): Promise<string> {
  const storage = getAssetStorage()
  const re = new RegExp(ASSET_ID_SCAN_RE.source, 'g')
  const ids = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(markdown)) !== null) {
    if (m[1]) ids.add(m[1])
  }
  await Promise.all([...ids].map((id) => storage.getAssetAsync(id)))
  return resolveAssetsInMarkdown(markdown, (id) => storage.getDataUrl(id))
}

/** 将渲染用 data URL 还原为 markflow-asset:// 引用后持久化 */
export async function persistMarkdownAssets(markdown: string): Promise<string> {
  const storage = getAssetStorage()
  await storage.warmCache()
  const restored = restoreAssetRefsInMarkdown(markdown, (b64) => storage.findIdByData(b64))
  return normalizeSerializedTaskListMarkdown(restored)
}

/** 收集所有笔记正文，供 GC 使用 */
export function collectAllNoteContents(
  getNoteList: () => { id: string }[],
  getNote: (id: string) => { content: string } | null
): string[] {
  return getNoteList()
    .map((item) => getNote(item.id)?.content ?? '')
    .filter(Boolean)
}

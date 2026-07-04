/** 去掉标题内常见 Markdown 内联标记，用于生成锚点 slug */
export function plainHeadingText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .trim()
}

/**
 * 将标题文本转为锚点 id（对齐 GitHub / Typora 常见写法）。
 * 例：`Docker 核心概念` → `docker-核心概念`，`项目介绍` → `项目介绍`
 */
export function slugifyHeading(text: string): string {
  const plain = plainHeadingText(text)
  return plain
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** 单次 Markdown 解析内去重：重复标题追加 -1、-2… */
export class HeadingSlugger {
  private used = new Set<string>()

  reset(): void {
    this.used.clear()
  }

  slug(text: string): string {
    let base = slugifyHeading(text)
    if (!base) base = 'section'

    let candidate = base
    let n = 1
    while (this.used.has(candidate)) {
      candidate = `${base}-${n}`
      n++
    }
    this.used.add(candidate)
    return candidate
  }
}

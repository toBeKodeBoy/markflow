export const TAG_MAX_LENGTH = 20

export function normalizeTags(input: string[]): { tags: string[]; rejected?: string } {
  const seen = new Set<string>()
  const tags: string[] = []
  for (const raw of input) {
    const t = raw.trim()
    if (!t) continue
    if (t.length > TAG_MAX_LENGTH) return { tags: [], rejected: t }
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(t)
  }
  return { tags }
}

export function normalizeTagInput(raw: string): string | null {
  const t = raw.trim()
  if (!t || t.length > TAG_MAX_LENGTH) return null
  return t
}

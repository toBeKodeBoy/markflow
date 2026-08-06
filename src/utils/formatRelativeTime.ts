/** 将时间戳格式化为相对时间文案（侧栏笔记更新时间） */
export function formatRelativeTime(ts: number, now: number = Date.now()): string {
  const diffMs = Math.max(0, now - ts)
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}小时前`

  const diffDays = Math.floor(diffHour / 24)
  if (diffDays < 7) return `${diffDays}天前`

  return new Date(ts).toLocaleDateString('zh', { month: 'short', day: 'numeric' })
}

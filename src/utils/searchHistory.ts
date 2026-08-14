import type { NoteListItem } from '../types'
import { RECENT_NOTE_LIMIT } from '../constants/recentFolder'

/** 搜索历史记录条目 */
interface SearchHistoryEntry {
  noteId: string
  searchedAt: number
}

const SEARCH_HISTORY_KEY = 'markflow.searchHistory'
const MAX_HISTORY_SIZE = 50

/** 读取搜索历史记录 */
function readHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    // 忽略读取失败（如存储空间已满、格式损坏）
    return []
  }
}

/** 保存搜索历史记录 */
function writeHistory(history: SearchHistoryEntry[]): void {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history))
  } catch {
    // 忽略写入失败（如存储空间已满）
  }
}

/**
 * 记录一次搜索交互
 * @param noteId - 笔记唯一标识符
 */
export function recordSearchInteraction(noteId: string): void {
  const history = readHistory()
  // 移除已存在的记录（避免重复）
  const filtered = history.filter((e) => e.noteId !== noteId)
  // 在头部插入新记录
  const next: SearchHistoryEntry = { noteId, searchedAt: Date.now() }
  const result = [next, ...filtered].slice(0, MAX_HISTORY_SIZE)
  writeHistory(result)
}

/**
 * 获取最近的搜索历史记录（按时间倒序）
 * @param limit - 返回数量上限，默认 50 条
 * @returns 搜索历史记录列表
 */
export function getSearchHistory(limit: number = 50): SearchHistoryEntry[] {
  const history = readHistory()
  return history.slice(0, limit)
}

/**
 * 从历史记录中移除某条笔记
 * @param noteId - 笔记唯一标识符
 */
export function clearSearchHistoryForNote(noteId: string): void {
  const history = readHistory()
  const filtered = history.filter((e) => e.noteId !== noteId)
  if (filtered.length !== history.length) {
    writeHistory(filtered)
  }
}

/**
 * 记录用户在搜索弹窗中点击了最近笔记
 * @param noteId - 笔记唯一标识符
 */
export function recordRecentNoteClick(noteId: string): void {
  recordSearchInteraction(noteId)
}

/**
 * 构建最近访问笔记列表（与侧边栏 Recent Folder 复用逻辑）
 * @param access - 访问记录数组
 * @param noteList - 完整笔记列表
 * @param limit - 返回数量上限
 * @returns 最近访问的笔记列表
 */
export function buildRecentNotesFromAccess(
  access: Array<{ noteId: string; openedAt: number }>,
  noteList: NoteListItem[],
  limit: number = RECENT_NOTE_LIMIT
): NoteListItem[] {
  const noteById = new Map(noteList.map((n) => [n.id, n]))
  const accessMap = new Map<string, { noteId: string; openedAt: number }>()

  for (const entry of access) {
    if (noteById.has(entry.noteId)) {
      accessMap.set(entry.noteId, entry)
    }
  }

  const candidates = [...accessMap.keys()]
    .map((id) => noteById.get(id)!)
    .sort((a, b) => {
      const entryA = accessMap.get(a.id)!
      const entryB = accessMap.get(b.id)!
      // 取最后访问时间或最后更新时间中的较大值
      const scoreA = Math.max(entryA.openedAt, a.updatedAt)
      const scoreB = Math.max(entryB.openedAt, b.updatedAt)
      return scoreB - scoreA
    })

  return candidates.slice(0, limit)
}

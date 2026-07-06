/**
 * 搜索防抖 composable — TDD
 * @file tests/unit/composables/useDebouncedSearch.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { effectScope } from 'vue'
import { useDebouncedSearch } from '../../../src/composables/useDebouncedSearch'

describe('useDebouncedSearch', () => {
  let scope: ReturnType<typeof effectScope>

  beforeEach(() => {
    vi.useFakeTimers()
    scope = effectScope()
  })

  afterEach(() => {
    scope.stop()
    vi.useRealTimers()
  })

  function runSearch(commit: (q: string) => void, delay?: number) {
    return scope.run(() => useDebouncedSearch(commit, delay !== undefined ? { delay } : {}))!
  }

  it('初始 localQuery 为空', () => {
    const commit = vi.fn()
    const { localQuery } = runSearch(commit)
    expect(localQuery.value).toBe('')
    expect(commit).not.toHaveBeenCalled()
  })

  it('输入后 300ms 才 commit', () => {
    const commit = vi.fn()
    const { localQuery } = runSearch(commit, 300)

    localQuery.value = '计'
    expect(commit).not.toHaveBeenCalled()

    vi.advanceTimersByTime(299)
    expect(commit).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(commit).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledWith('计')
  })

  it('连续输入仅 commit 最后一次', () => {
    const commit = vi.fn()
    const { localQuery } = runSearch(commit, 300)

    localQuery.value = 'a'
    vi.advanceTimersByTime(100)
    localQuery.value = 'ab'
    vi.advanceTimersByTime(100)
    localQuery.value = 'abc'
    vi.advanceTimersByTime(300)

    expect(commit).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledWith('abc')
  })

  it('clearSearch 立即 commit 空字符串', () => {
    const commit = vi.fn()
    const { localQuery, clearSearch } = runSearch(commit, 300)

    localQuery.value = 'test'
    clearSearch()

    expect(localQuery.value).toBe('')
    expect(commit).toHaveBeenCalledWith('')
  })

  it('clearSearch 取消待执行的 debounce', () => {
    const commit = vi.fn()
    const { localQuery, clearSearch } = runSearch(commit, 300)

    localQuery.value = 'pending'
    clearSearch()
    vi.advanceTimersByTime(300)

    expect(commit).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledWith('')
  })

  it('输入清空为 "" 时立即 commit，不等 debounce', () => {
    const commit = vi.fn()
    const { localQuery } = runSearch(commit, 300)

    localQuery.value = 'abc'
    vi.advanceTimersByTime(300)
    expect(commit).toHaveBeenCalledWith('abc')

    commit.mockClear()
    localQuery.value = ''
    expect(commit).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledWith('')

    vi.advanceTimersByTime(300)
    expect(commit).toHaveBeenCalledTimes(1)
  })
})

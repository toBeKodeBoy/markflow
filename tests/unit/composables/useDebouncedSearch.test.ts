import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useDebouncedSearch } from '../../../src/composables/useDebouncedSearch'

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces query updates by default 300ms', async () => {
    const target = ref('')
    const { draft, flush } = useDebouncedSearch(target)

    draft.value = 'a'
    await nextTick()
    expect(target.value).toBe('')

    vi.advanceTimersByTime(299)
    expect(target.value).toBe('')

    vi.advanceTimersByTime(1)
    expect(target.value).toBe('a')

    draft.value = 'ab'
    flush()
    expect(target.value).toBe('ab')
  })

  it('clears target immediately when draft is empty', async () => {
    const target = ref('old')
    const { draft } = useDebouncedSearch(target)
    draft.value = ''
    await nextTick()
    expect(target.value).toBe('')
  })
})

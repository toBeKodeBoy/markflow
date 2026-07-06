import { ref, computed, onScopeDispose, type ComputedRef } from 'vue'

export interface UseDebouncedSearchOptions {
  delay?: number
}

export function useDebouncedSearch(
  commit: (query: string) => void,
  options: UseDebouncedSearchOptions = {}
): { localQuery: ComputedRef<string>; clearSearch: () => void; syncQuery: (value: string) => void } {
  const delay = options.delay ?? 300
  const inner = ref('')
  let timer: ReturnType<typeof setTimeout> | null = null

  function scheduleCommit(value: string) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      commit(value)
    }, delay)
  }

  const localQuery = computed({
    get: () => inner.value,
    set: (value: string) => {
      inner.value = value
      if (!value.trim()) {
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
        commit('')
        return
      }
      scheduleCommit(value)
    },
  })

  function clearSearch() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    inner.value = ''
    commit('')
  }

  function syncQuery(value: string) {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    inner.value = value
  }

  onScopeDispose(() => {
    if (timer) clearTimeout(timer)
  })

  return { localQuery, clearSearch, syncQuery }
}

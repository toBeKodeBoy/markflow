import { ref, watch, type Ref } from 'vue'

export interface UseDebouncedSearchOptions {
  delayMs?: number
}

export function useDebouncedSearch(target: Ref<string>, options: UseDebouncedSearchOptions = {}) {
  const delayMs = options.delayMs ?? 300
  const draft = ref(target.value)
  let timer: ReturnType<typeof setTimeout> | null = null

  function flush() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    target.value = draft.value
  }

  watch(draft, (value) => {
    if (timer) clearTimeout(timer)
    if (!value.trim()) {
      target.value = ''
      return
    }
    timer = setTimeout(() => {
      target.value = value
      timer = null
    }, delayMs)
  })

  watch(target, (value) => {
    if (value !== draft.value) draft.value = value
  })

  return { draft, flush }
}

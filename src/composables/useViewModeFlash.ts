import { inject, provide, type InjectionKey } from 'vue'

export type ViewModeFlashRegistry = {
  register: (fn: () => void) => () => void
  flash: () => void
}

export const viewModeFlashKey: InjectionKey<ViewModeFlashRegistry> = Symbol('viewModeFlash')

export function createViewModeFlashRegistry(): ViewModeFlashRegistry {
  const handlers = new Set<() => void>()
  return {
    register(fn) {
      handlers.add(fn)
      return () => {
        handlers.delete(fn)
      }
    },
    flash() {
      for (const fn of handlers) fn()
    },
  }
}

export function provideViewModeFlash(registry: ViewModeFlashRegistry) {
  provide(viewModeFlashKey, registry)
}

export function useViewModeFlash() {
  return inject(viewModeFlashKey, null)
}

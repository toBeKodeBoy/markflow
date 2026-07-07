import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick, defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import {
  FOCUS_TOOLBAR_ZONE_PX,
  shouldShowFocusToolbar,
  useFocusToolbarVisibility,
} from '../../../src/composables/useFocusToolbarVisibility'

describe('shouldShowFocusToolbar', () => {
  const height = 800
  const zone = FOCUS_TOOLBAR_ZONE_PX

  it('returns false when pointer is above the bottom zone', () => {
    expect(shouldShowFocusToolbar(100, height, { zonePx: zone })).toBe(false)
    expect(shouldShowFocusToolbar(height - zone - 1, height, { zonePx: zone })).toBe(false)
  })

  it('returns true when pointer enters the bottom zone', () => {
    expect(shouldShowFocusToolbar(height - zone, height, { zonePx: zone })).toBe(true)
    expect(shouldShowFocusToolbar(height - 1, height, { zonePx: zone })).toBe(true)
  })

  it('stays visible while toolbar is hovered even outside the zone', () => {
    expect(
      shouldShowFocusToolbar(100, height, { zonePx: zone, hoveringToolbar: true })
    ).toBe(true)
  })
})

function mountFocusToolbarVisibility(enabled = ref(true)) {
  let api!: ReturnType<typeof useFocusToolbarVisibility>
  mount(
    defineComponent({
      setup() {
        api = useFocusToolbarVisibility(enabled)
        return () => null
      },
    })
  )
  return { api, enabled }
}

describe('useFocusToolbarVisibility', () => {
  beforeEach(() => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts hidden when focus mode is enabled', async () => {
    const { api } = mountFocusToolbarVisibility(ref(true))
    await nextTick()
    expect(api.visible.value).toBe(false)
  })

  it('shows toolbar when mouse moves into bottom zone', async () => {
    const { api } = mountFocusToolbarVisibility(ref(true))
    await nextTick()

    window.dispatchEvent(new MouseEvent('mousemove', { clientY: 760 }))
    expect(api.visible.value).toBe(true)
  })

  it('hides toolbar when mouse leaves bottom zone and toolbar is not hovered', async () => {
    const { api } = mountFocusToolbarVisibility(ref(true))
    await nextTick()

    window.dispatchEvent(new MouseEvent('mousemove', { clientY: 760 }))
    expect(api.visible.value).toBe(true)

    window.dispatchEvent(new MouseEvent('mousemove', { clientY: 200 }))
    expect(api.visible.value).toBe(false)
  })

  it('keeps toolbar visible while hovered', async () => {
    const { api } = mountFocusToolbarVisibility(ref(true))
    await nextTick()

    api.onToolbarEnter()
    window.dispatchEvent(new MouseEvent('mousemove', { clientY: 200 }))
    expect(api.visible.value).toBe(true)

    api.onToolbarLeave()
    expect(api.visible.value).toBe(false)
  })

  it('resets visibility when focus mode is disabled', async () => {
    const enabled = ref(true)
    const { api } = mountFocusToolbarVisibility(enabled)
    await nextTick()

    window.dispatchEvent(new MouseEvent('mousemove', { clientY: 760 }))
    expect(api.visible.value).toBe(true)

    enabled.value = false
    await nextTick()
    expect(api.visible.value).toBe(false)
  })
})

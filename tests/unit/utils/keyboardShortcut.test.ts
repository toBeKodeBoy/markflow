import { describe, it, expect } from 'vitest'
import { isModAltKeyShortcut } from '../../../src/utils/keyboardShortcut'

function keyEvent(init: KeyboardEventInit) {
  return new KeyboardEvent('keydown', { bubbles: true, ...init })
}

describe('isModAltKeyShortcut', () => {
  it('识别 Ctrl+Alt+S 的 key 与 code', () => {
    expect(isModAltKeyShortcut(keyEvent({ key: 's', altKey: true, ctrlKey: true }), 's')).toBe(true)
    expect(isModAltKeyShortcut(keyEvent({
      key: 'Unidentified',
      code: 'KeyS',
      altKey: true,
      ctrlKey: true,
    }), 's')).toBe(true)
    expect(isModAltKeyShortcut(keyEvent({ key: 's', altKey: true, metaKey: true }), 's')).toBe(true)
  })

  it('缺少 Ctrl/Alt 或夹带 Shift 时不命中', () => {
    expect(isModAltKeyShortcut(keyEvent({ key: 's', ctrlKey: true }), 's')).toBe(false)
    expect(isModAltKeyShortcut(keyEvent({ key: 's', altKey: true }), 's')).toBe(false)
    expect(isModAltKeyShortcut(keyEvent({ key: 's', altKey: true, ctrlKey: true, shiftKey: true }), 's')).toBe(false)
    expect(isModAltKeyShortcut(keyEvent({ key: 'k', altKey: true, ctrlKey: true }), 's')).toBe(false)
  })
})

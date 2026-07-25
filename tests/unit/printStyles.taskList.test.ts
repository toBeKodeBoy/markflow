import { describe, expect, it } from 'vitest'
import { buildPrintStyles } from '../../src/utils/printStyles'

describe('print task list styles', () => {
  const css = buildPrintStyles()

  it('adds a strike-through only to checked preview task items in print output', () => {
    const checkedRule = css.match(/\.markdown-body\s+li\.task-list-item\[data-checked="true"\]\s*\{[^}]+\}/)?.[0] ?? ''
    const uncheckedRule = css.match(/\.markdown-body\s+li\.task-list-item\[data-checked="false"\]\s*\{[^}]+\}/)?.[0] ?? ''
    expect(checkedRule).toMatch(/text-decoration:\s*line-through/)
    expect(uncheckedRule).not.toMatch(/line-through/)
  })

  it('keeps printed task items aligned to the same line-height rhythm', () => {
    const itemRule = css.match(/\.markdown-body\s+li\.task-list-item\s*\{[^}]+\}/)?.[0] ?? ''
    expect(itemRule).toMatch(/line-height:\s*inherit/)
    expect(itemRule).toMatch(/gap:\s*0\.35em/)
  })
})

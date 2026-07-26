import { describe, expect, it } from 'vitest'
import { renderPathTemplate } from '../../../src/utils/pathTemplate'

describe('renderPathTemplate', () => {
  it('renders supported variables', () => {
    const rendered = renderPathTemplate('./assets/${filename}/${date}-${time}-${noteTitle}', {
      filename: 'weekly-note',
      noteTitle: '周报/项目A',
      date: '2026-07-26',
      time: '103015',
    })

    expect(rendered).toBe('./assets/weekly-note/2026-07-26-103015-周报_项目A')
  })

  it('keeps unknown placeholders unchanged', () => {
    const rendered = renderPathTemplate('./${unknown}/${filename}', {
      filename: 'demo',
      noteTitle: 'demo',
      date: '2026-07-26',
      time: '103015',
    })

    expect(rendered).toBe('./${unknown}/demo')
  })
})

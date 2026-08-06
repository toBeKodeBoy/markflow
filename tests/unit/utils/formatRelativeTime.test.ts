import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatRelativeTime } from '../../../src/utils/formatRelativeTime'

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('1 分钟内显示刚刚', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-06T12:00:00'))
    expect(formatRelativeTime(Date.parse('2026-08-06T11:59:30'))).toBe('刚刚')
  })

  it('1 小时内显示分钟前', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-06T12:00:00'))
    expect(formatRelativeTime(Date.parse('2026-08-06T11:40:00'))).toBe('20分钟前')
  })

  it('24 小时内显示小时前', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-06T12:00:00'))
    expect(formatRelativeTime(Date.parse('2026-08-06T10:00:00'))).toBe('2小时前')
  })

  it('7 天内显示天前', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-06T12:00:00'))
    expect(formatRelativeTime(Date.parse('2026-08-03T12:00:00'))).toBe('3天前')
  })

  it('更早显示短日期', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-06T12:00:00'))
    const result = formatRelativeTime(Date.parse('2026-06-01T08:00:00'))
    expect(result).toMatch(/6月|Jun|6/)
  })
})

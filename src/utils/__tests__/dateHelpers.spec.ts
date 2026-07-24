import { describe, it, expect } from 'vitest'
import { parseLocalDate, daysFromToday, toLocalDateStr } from '../dateHelpers'

describe('parseLocalDate', () => {
  it('reads a date-only string as local midnight, not UTC', () => {
    const parsed = parseLocalDate('2026-07-27')

    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(6) // zero-based
    expect(parsed.getDate()).toBe(27)
    expect(parsed.getHours()).toBe(0)
  })

  it('round-trips with toLocalDateStr', () => {
    const original = '2026-01-01'
    expect(toLocalDateStr(parseLocalDate(original))).toBe(original)
  })
})

describe('daysFromToday', () => {
  const offsetDate = (days: number): string => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + days)
    return toLocalDateStr(d)
  }

  it('returns 0 for today', () => {
    expect(daysFromToday(offsetDate(0))).toBe(0)
  })

  it('counts future dates positively', () => {
    expect(daysFromToday(offsetDate(1))).toBe(1)
    expect(daysFromToday(offsetDate(7))).toBe(7)
    expect(daysFromToday(offsetDate(365))).toBe(365)
  })

  it('counts past dates negatively', () => {
    expect(daysFromToday(offsetDate(-1))).toBe(-1)
    expect(daysFromToday(offsetDate(-30))).toBe(-30)
  })

  it('stays exact across a daylight-saving style month boundary', () => {
    // Rounding rather than ceiling keeps a 23- or 25-hour day from drifting.
    for (const offset of [28, 29, 30, 31, 32]) {
      expect(daysFromToday(offsetDate(offset))).toBe(offset)
    }
  })
})

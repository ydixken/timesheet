import { describe, it, expect } from 'vitest'
import {
  formatDuration, formatDecimalHours, parseHoursToMinutes,
  getWeekDates, formatDateHeading, groupEntriesByDate
} from '../time'

describe('formatDuration', () => {
  it('formats hours only', () => expect(formatDuration(120)).toBe('2h'))
  it('formats minutes only', () => expect(formatDuration(30)).toBe('30m'))
  it('formats hours and minutes', () => expect(formatDuration(150)).toBe('2h 30m'))
  it('formats zero', () => expect(formatDuration(0)).toBe('0m'))
})

describe('formatDecimalHours', () => {
  it('formats to one decimal', () => expect(formatDecimalHours(390)).toBe('6.5'))
  it('formats whole hours', () => expect(formatDecimalHours(480)).toBe('8.0'))
})

describe('parseHoursToMinutes', () => {
  it('parses decimal hours', () => expect(parseHoursToMinutes('6.5')).toBe(390))
  it('parses comma decimal', () => expect(parseHoursToMinutes('6,5')).toBe(390))
  it('parses HH:MM format', () => expect(parseHoursToMinutes('6:30')).toBe(390))
  it('parses whole number', () => expect(parseHoursToMinutes('8')).toBe(480))
  it('returns null for invalid input', () => expect(parseHoursToMinutes('abc')).toBe(null))
  it('returns null for negative', () => expect(parseHoursToMinutes('-5')).toBe(null))
})

describe('getWeekDates', () => {
  it('returns Monday to Sunday', () => {
    const result = getWeekDates(new Date('2026-03-04')) // Wednesday
    expect(result.dates).toHaveLength(7)
    expect(result.start).toBe('2026-03-02') // Monday
    expect(result.end).toBe('2026-03-08')   // Sunday
  })
})

describe('groupEntriesByDate', () => {
  it('groups entries by date', () => {
    const entries = [
      { date: '2026-03-02', id: '1' },
      { date: '2026-03-02', id: '2' },
      { date: '2026-03-03', id: '3' },
    ]
    const grouped = groupEntriesByDate(entries)
    expect(grouped.get('2026-03-02')).toHaveLength(2)
    expect(grouped.get('2026-03-03')).toHaveLength(1)
  })
})

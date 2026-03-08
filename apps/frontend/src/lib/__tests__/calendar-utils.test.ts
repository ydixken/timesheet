import { describe, it, expect } from 'vitest'
import type { EntryWithProject } from '../../types'
import {
  timeToMinutes,
  computeEntryPosition,
  computeOverlapLayout,
  splitScheduledUnscheduled,
  isToday,
  isWeekend,
  formatWeekLabel,
  formatDayLabel,
  getSmartScrollTarget,
  MIN_ENTRY_HEIGHT,
} from '../calendar-utils'

function mockEntry(overrides: Partial<EntryWithProject> = {}): EntryWithProject {
  return {
    id: 'test-id',
    projectId: 'proj-1',
    taskId: null,
    date: '2026-03-02',
    startTime: null,
    endTime: null,
    durationMin: 60,
    description: 'Test entry',
    billable: true,
    createdAt: '2026-03-02T00:00:00Z',
    updatedAt: '2026-03-02T00:00:00Z',
    project: { id: 'proj-1', name: 'Test', color: '#ff0000', clientId: null },
    client: null,
    ...overrides,
  }
}

describe('timeToMinutes', () => {
  it('converts 09:30 to 570', () => expect(timeToMinutes('09:30')).toBe(570))
  it('converts 00:00 to 0', () => expect(timeToMinutes('00:00')).toBe(0))
  it('converts 23:59 to 1439', () => expect(timeToMinutes('23:59')).toBe(1439))
})

describe('computeEntryPosition', () => {
  it('computes correct top and height for 09:00-12:00 at hourHeight=60', () => {
    const { top, height } = computeEntryPosition('09:00', '12:00', 180, 60)
    expect(top).toBe(540)   // 9 * 60
    expect(height).toBe(180) // 3 * 60
  })

  it('uses durationMin when endTime is null', () => {
    const { top, height } = computeEntryPosition('10:00', null, 90, 60)
    expect(top).toBe(600)   // 10 * 60
    expect(height).toBe(90) // 1.5 * 60
  })

  it('clamps very short entries to MIN_ENTRY_HEIGHT', () => {
    const { height } = computeEntryPosition('09:00', '09:10', 10, 60)
    // 10min at 60px/hr = 10px, but clamped to 20
    expect(height).toBe(MIN_ENTRY_HEIGHT)
  })
})

describe('computeOverlapLayout', () => {
  it('returns empty array for no entries', () => {
    expect(computeOverlapLayout([], 60)).toEqual([])
  })

  it('returns empty array when all entries lack startTime', () => {
    const entries = [mockEntry({ startTime: null })]
    expect(computeOverlapLayout(entries, 60)).toEqual([])
  })

  it('places a single entry in column 0 with totalColumns 1', () => {
    const entries = [mockEntry({ id: 'a', startTime: '09:00', endTime: '10:00', durationMin: 60 })]
    const result = computeOverlapLayout(entries, 60)
    expect(result).toHaveLength(1)
    expect(result[0].column).toBe(0)
    expect(result[0].totalColumns).toBe(1)
  })

  it('gives two non-overlapping entries each totalColumns=1', () => {
    const entries = [
      mockEntry({ id: 'a', startTime: '09:00', endTime: '10:00', durationMin: 60 }),
      mockEntry({ id: 'b', startTime: '11:00', endTime: '12:00', durationMin: 60 }),
    ]
    const result = computeOverlapLayout(entries, 60)
    expect(result).toHaveLength(2)
    expect(result[0].totalColumns).toBe(1)
    expect(result[1].totalColumns).toBe(1)
  })

  it('assigns two overlapping entries to separate columns with totalColumns=2', () => {
    const entries = [
      mockEntry({ id: 'a', startTime: '09:00', endTime: '11:00', durationMin: 120 }),
      mockEntry({ id: 'b', startTime: '10:00', endTime: '12:00', durationMin: 120 }),
    ]
    const result = computeOverlapLayout(entries, 60)
    expect(result).toHaveLength(2)

    const colA = result.find(r => r.entry.id === 'a')!
    const colB = result.find(r => r.entry.id === 'b')!
    expect(colA.column).toBe(0)
    expect(colB.column).toBe(1)
    expect(colA.totalColumns).toBe(2)
    expect(colB.totalColumns).toBe(2)
  })

  it('handles three overlapping + one separate entry', () => {
    const entries = [
      mockEntry({ id: 'a', startTime: '09:00', endTime: '11:00', durationMin: 120 }),
      mockEntry({ id: 'b', startTime: '10:00', endTime: '12:00', durationMin: 120 }),
      mockEntry({ id: 'c', startTime: '10:30', endTime: '11:30', durationMin: 60 }),
      mockEntry({ id: 'd', startTime: '14:00', endTime: '15:00', durationMin: 60 }),
    ]
    const result = computeOverlapLayout(entries, 60)
    expect(result).toHaveLength(4)

    const grouped = Object.fromEntries(result.map(r => [r.entry.id, r]))
    expect(grouped['a'].totalColumns).toBe(3)
    expect(grouped['b'].totalColumns).toBe(3)
    expect(grouped['c'].totalColumns).toBe(3)
    expect(grouped['d'].totalColumns).toBe(1)
  })
})

describe('splitScheduledUnscheduled', () => {
  it('partitions entries by startTime presence', () => {
    const entries = [
      mockEntry({ id: 'scheduled', startTime: '09:00' }),
      mockEntry({ id: 'unscheduled', startTime: null }),
      mockEntry({ id: 'also-scheduled', startTime: '14:00' }),
    ]
    const { scheduled, unscheduled } = splitScheduledUnscheduled(entries)
    expect(scheduled).toHaveLength(2)
    expect(unscheduled).toHaveLength(1)
    expect(unscheduled[0].id).toBe('unscheduled')
  })

  it('returns empty arrays for empty input', () => {
    const { scheduled, unscheduled } = splitScheduledUnscheduled([])
    expect(scheduled).toEqual([])
    expect(unscheduled).toEqual([])
  })
})

describe('isToday', () => {
  it('returns true for today', () => {
    const todayStr = new Date().toISOString().split('T')[0]
    expect(isToday(todayStr)).toBe(true)
  })

  it('returns false for a past date', () => {
    expect(isToday('2020-01-01')).toBe(false)
  })
})

describe('isWeekend', () => {
  it('returns true for Saturday', () => {
    // 2026-03-07 is Saturday
    expect(isWeekend('2026-03-07')).toBe(true)
  })

  it('returns true for Sunday', () => {
    // 2026-03-08 is Sunday
    expect(isWeekend('2026-03-08')).toBe(true)
  })

  it('returns false for Monday', () => {
    // 2026-03-02 is Monday
    expect(isWeekend('2026-03-02')).toBe(false)
  })

  it('returns false for Wednesday', () => {
    // 2026-03-04 is Wednesday
    expect(isWeekend('2026-03-04')).toBe(false)
  })
})

describe('formatWeekLabel', () => {
  it('formats same-month range', () => {
    expect(formatWeekLabel('2026-03-02', '2026-03-08')).toBe('Mar 2 – 8, 2026')
  })

  it('formats cross-month range', () => {
    expect(formatWeekLabel('2026-02-24', '2026-03-02')).toBe('Feb 24 – Mar 2, 2026')
  })
})

describe('formatDayLabel', () => {
  it('formats a date with weekday, month, day, year', () => {
    expect(formatDayLabel('2026-03-05')).toBe('Thursday, March 5, 2026')
  })
})

describe('getSmartScrollTarget', () => {
  it('returns default scroll hour offset when no entries have startTime', () => {
    const entries = [mockEntry({ startTime: null })]
    expect(getSmartScrollTarget(entries, 60)).toBe(420) // 7 * 60
  })

  it('returns default for empty entries', () => {
    expect(getSmartScrollTarget([], 60)).toBe(420)
  })

  it('scrolls to earliest entry when before default hour', () => {
    const entries = [
      mockEntry({ startTime: '06:00', durationMin: 60 }),
      mockEntry({ startTime: '09:00', durationMin: 60 }),
    ]
    expect(getSmartScrollTarget(entries, 60)).toBe(360) // 6 * 60
  })

  it('uses default hour when entries are later', () => {
    const entries = [
      mockEntry({ startTime: '09:00', durationMin: 60 }),
    ]
    expect(getSmartScrollTarget(entries, 60)).toBe(420) // 7 * 60, since 9 > 7
  })
})

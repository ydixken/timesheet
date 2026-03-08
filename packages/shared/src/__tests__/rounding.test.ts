import { describe, it, expect } from 'vitest'
import { roundMinutes } from '../utils/rounding'

describe('roundMinutes', () => {
  it('returns 0 for 0 minutes', () => {
    expect(roundMinutes(0, 15)).toBe(0)
  })

  it('rounds to nearest 5 min', () => {
    expect(roundMinutes(7, 5)).toBe(5)
    expect(roundMinutes(8, 5)).toBe(10)
    expect(roundMinutes(12, 5)).toBe(10)
    expect(roundMinutes(13, 5)).toBe(15)
  })

  it('rounds to nearest 6 min (0.1h)', () => {
    expect(roundMinutes(33, 6)).toBe(36)
    expect(roundMinutes(3, 6)).toBe(6)
    expect(roundMinutes(2, 6)).toBe(0)
  })

  it('rounds to nearest 15 min', () => {
    expect(roundMinutes(7, 15)).toBe(0)
    expect(roundMinutes(8, 15)).toBe(15)
    expect(roundMinutes(23, 15)).toBe(30)
    expect(roundMinutes(47, 15)).toBe(45)
    expect(roundMinutes(53, 15)).toBe(60)
  })

  it('rounds to nearest 30 min', () => {
    expect(roundMinutes(14, 30)).toBe(0)
    expect(roundMinutes(15, 30)).toBe(30)
    expect(roundMinutes(45, 30)).toBe(60)
    expect(roundMinutes(46, 30)).toBe(60)
  })

  it('returns original value when roundTo is 0', () => {
    expect(roundMinutes(47, 0)).toBe(47)
  })

  it('returns original value when roundTo is negative', () => {
    expect(roundMinutes(47, -5)).toBe(47)
  })
})

import { describe, it, expect } from 'vitest'
import { computeBudgetStatus, budgetLevelColors } from '../utils/budget'

describe('computeBudgetStatus', () => {
  it('returns null percentage when estimatedHours is null', () => {
    const result = computeBudgetStatus(null, 0)
    expect(result.percentage).toBeNull()
    expect(result.level).toBe('ok')
    expect(result.crossedThresholds).toEqual([])
  })

  it('treats zero budget as no budget', () => {
    const result = computeBudgetStatus('0', 600)
    expect(result.percentage).toBeNull()
    expect(result.level).toBe('ok')
  })

  it('returns ok level at 66.67%', () => {
    const result = computeBudgetStatus('10', 400)
    expect(result.percentage).toBe(66.7)
    expect(result.level).toBe('ok')
    expect(result.crossedThresholds).toEqual([])
  })

  it('returns warning level at exactly 80%', () => {
    const result = computeBudgetStatus('10', 480)
    expect(result.percentage).toBe(80)
    expect(result.level).toBe('warning')
    expect(result.crossedThresholds).toEqual([80])
  })

  it('returns warning level at 85%', () => {
    const result = computeBudgetStatus('10', 510)
    expect(result.percentage).toBe(85)
    expect(result.level).toBe('warning')
    expect(result.crossedThresholds).toEqual([80])
  })

  it('returns danger level at exactly 90%', () => {
    const result = computeBudgetStatus('10', 540)
    expect(result.percentage).toBe(90)
    expect(result.level).toBe('danger')
    expect(result.crossedThresholds).toEqual([80, 90])
  })

  it('returns danger level at 95%', () => {
    const result = computeBudgetStatus('10', 570)
    expect(result.percentage).toBe(95)
    expect(result.level).toBe('danger')
    expect(result.crossedThresholds).toEqual([80, 90])
  })

  it('returns exceeded level at exactly 100%', () => {
    const result = computeBudgetStatus('10', 600)
    expect(result.percentage).toBe(100)
    expect(result.level).toBe('exceeded')
    expect(result.crossedThresholds).toEqual([80, 90, 100])
  })

  it('returns exceeded level and 0 remaining hours when over budget', () => {
    const result = computeBudgetStatus('10', 720)
    expect(result.percentage).toBe(120)
    expect(result.level).toBe('exceeded')
    expect(result.remainingHours).toBe(0)
  })
})

describe('budgetLevelColors', () => {
  it('returns green colors for ok level', () => {
    expect(budgetLevelColors('ok').bar).toBe('bg-terminal-green')
  })

  it('returns warning colors for warning level', () => {
    expect(budgetLevelColors('warning').bar).toBe('bg-terminal-warning')
  })

  it('returns danger colors for danger level', () => {
    expect(budgetLevelColors('danger').bar).toBe('bg-terminal-danger')
  })

  it('returns danger colors for exceeded level', () => {
    expect(budgetLevelColors('exceeded').bar).toBe('bg-terminal-danger')
  })
})

import { describe, it, expect } from 'vitest'
import { fuzzyMatch, fuzzySearch } from '../fuzzy'

describe('fuzzyMatch', () => {
  it('"k8s depl" matches "K8s Platform deployment"', () => {
    const score = fuzzyMatch('k8s depl', 'K8s Platform deployment')
    expect(score).toBeGreaterThan(0)
  })

  it('returns 0 for non-matching query', () => {
    expect(fuzzyMatch('xyz', 'K8s Platform deployment')).toBe(0)
  })

  it('is case insensitive', () => {
    const lower = fuzzyMatch('deploy', 'Cloud Deployment')
    const upper = fuzzyMatch('DEPLOY', 'Cloud Deployment')
    expect(lower).toBeGreaterThan(0)
    expect(lower).toBe(upper)
  })

  it('gives prefix/word-boundary bonus', () => {
    const atBoundary = fuzzyMatch('deploy', 'Cloud deploy task')
    const inMiddle = fuzzyMatch('deploy', 'Clouddeploytask')
    expect(atBoundary).toBeGreaterThan(inMiddle)
  })
})

describe('fuzzySearch', () => {
  const items = [
    'K8s Platform deployment',
    'Cloud infrastructure review',
    'Deploy monitoring stack',
    'Write documentation',
    'Database migration',
  ]

  it('returns [] for empty query', () => {
    expect(fuzzySearch('', items, (i) => i)).toEqual([])
  })

  it('returns [] for single char query (minimum 2 chars)', () => {
    expect(fuzzySearch('k', items, (i) => i)).toEqual([])
  })

  it('returns matching items sorted by score', () => {
    const results = fuzzySearch('depl', items, (i) => i)
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((r) => r.score > 0)).toBe(true)
    // Scores should be sorted descending
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
    }
  })

  it('respects limit parameter', () => {
    const manyItems = Array.from({ length: 20 }, (_, i) => `deploy task ${i}`)
    const results = fuzzySearch('deploy', manyItems, (i) => i, 3)
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it('works with object items and accessor', () => {
    const entries = [
      { id: 1, desc: 'K8s deployment' },
      { id: 2, desc: 'Write docs' },
    ]
    const results = fuzzySearch('k8s', entries, (e) => e.desc)
    expect(results.length).toBe(1)
    expect(results[0].item.id).toBe(1)
  })
})

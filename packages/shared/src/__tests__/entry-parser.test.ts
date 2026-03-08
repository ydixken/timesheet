import { describe, it, expect } from 'vitest'
import { parseQuickEntry, matchProject } from '../utils/entry-parser'

describe('parseQuickEntry', () => {
  describe('duration formats', () => {
    it('parses hours: 2h', () => {
      const result = parseQuickEntry('2h K8s')
      expect(result).toEqual({ durationMin: 120, projectQuery: 'K8s', description: '' })
    })

    it('parses minutes: 30m', () => {
      const result = parseQuickEntry('30m K8s')
      expect(result).toEqual({ durationMin: 30, projectQuery: 'K8s', description: '' })
    })

    it('parses hours and minutes: 1h30m', () => {
      const result = parseQuickEntry('1h30m K8s')
      expect(result).toEqual({ durationMin: 90, projectQuery: 'K8s', description: '' })
    })

    it('parses decimal hours: 1.5h', () => {
      const result = parseQuickEntry('1.5h K8s')
      expect(result).toEqual({ durationMin: 90, projectQuery: 'K8s', description: '' })
    })

    it('parses colon format: 2:30', () => {
      const result = parseQuickEntry('2:30 K8s')
      expect(result).toEqual({ durationMin: 150, projectQuery: 'K8s', description: '' })
    })

    it('parses small decimal hours: 0.5h', () => {
      const result = parseQuickEntry('0.5h K8s')
      expect(result).toEqual({ durationMin: 30, projectQuery: 'K8s', description: '' })
    })
  })

  describe('project and description splitting', () => {
    it('parses project query and description separated by pipe', () => {
      const result = parseQuickEntry('2h K8s | deploy')
      expect(result).toEqual({ durationMin: 120, projectQuery: 'K8s', description: 'deploy' })
    })

    it('parses project query without description', () => {
      const result = parseQuickEntry('2h K8s')
      expect(result).toEqual({ durationMin: 120, projectQuery: 'K8s', description: '' })
    })

    it('splits only on first pipe, keeps rest in description', () => {
      const result = parseQuickEntry('2h K8s | deploy | fix')
      expect(result).toEqual({ durationMin: 120, projectQuery: 'K8s', description: 'deploy | fix' })
    })
  })

  describe('edge cases', () => {
    it('returns null for empty string', () => {
      expect(parseQuickEntry('')).toBeNull()
    })

    it('returns null for whitespace only', () => {
      expect(parseQuickEntry('   ')).toBeNull()
    })

    it('returns null when no duration is found', () => {
      expect(parseQuickEntry('K8s deploy')).toBeNull()
    })

    it('returns null when duration only, no project query', () => {
      expect(parseQuickEntry('2h')).toBeNull()
    })

    it('returns null when project query is empty before pipe', () => {
      expect(parseQuickEntry('2h | desc')).toBeNull()
    })
  })
})

describe('matchProject', () => {
  const projects = [
    { name: 'K8s Migration', id: '1' },
    { name: 'Platform Engineering', id: '2' },
    { name: 'Cloud Infra', id: '3' },
  ]

  it('matches exact name', () => {
    expect(matchProject('K8s Migration', projects)).toEqual({ name: 'K8s Migration', id: '1' })
  })

  it('matches substring', () => {
    expect(matchProject('Platform', projects)).toEqual({ name: 'Platform Engineering', id: '2' })
  })

  it('matches case-insensitively', () => {
    expect(matchProject('cloud', projects)).toEqual({ name: 'Cloud Infra', id: '3' })
  })

  it('returns null when no match', () => {
    expect(matchProject('Terraform', projects)).toBeNull()
  })

  it('returns null for empty projects array', () => {
    expect(matchProject('K8s', [])).toBeNull()
  })
})

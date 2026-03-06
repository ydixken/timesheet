import { describe, it, expect } from 'vitest'
import {
  CreateEntrySchema, CreateProjectSchema, CreateClientSchema,
  CreateTaskSchema, LoginSchema
} from '../schemas/index.js'

describe('LoginSchema', () => {
  it('validates valid login', () => {
    const result = LoginSchema.safeParse({ username: 'admin', password: 'secret' })
    expect(result.success).toBe(true)
  })
  it('rejects empty username', () => {
    const result = LoginSchema.safeParse({ username: '', password: 'secret' })
    expect(result.success).toBe(false)
  })
})

describe('CreateEntrySchema', () => {
  it('validates entry with duration only', () => {
    const result = CreateEntrySchema.safeParse({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2026-03-06',
      durationMin: 360,
    })
    expect(result.success).toBe(true)
  })
  it('validates entry with start/end time', () => {
    const result = CreateEntrySchema.safeParse({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2026-03-06',
      startTime: '09:00',
      endTime: '15:00',
      durationMin: 360,
    })
    expect(result.success).toBe(true)
  })
  it('rejects invalid date format', () => {
    const result = CreateEntrySchema.safeParse({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      date: '06-03-2026',
      durationMin: 360,
    })
    expect(result.success).toBe(false)
  })
  it('rejects negative duration', () => {
    const result = CreateEntrySchema.safeParse({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2026-03-06',
      durationMin: -10,
    })
    expect(result.success).toBe(false)
  })
  it('rejects invalid time format', () => {
    const result = CreateEntrySchema.safeParse({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2026-03-06',
      startTime: '9:00',
      durationMin: 360,
    })
    expect(result.success).toBe(false)
  })
})

describe('CreateProjectSchema', () => {
  it('validates with defaults', () => {
    const result = CreateProjectSchema.safeParse({ name: 'Test Project' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.color).toBe('#39ff14')
      expect(result.data.billable).toBe(true)
      expect(result.data.active).toBe(true)
    }
  })
  it('rejects invalid color', () => {
    const result = CreateProjectSchema.safeParse({ name: 'Test', color: 'red' })
    expect(result.success).toBe(false)
  })
  it('validates color hex', () => {
    const result = CreateProjectSchema.safeParse({ name: 'Test', color: '#ff5500' })
    expect(result.success).toBe(true)
  })
})

describe('CreateClientSchema', () => {
  it('validates with name only', () => {
    const result = CreateClientSchema.safeParse({ name: 'ACME Corp' })
    expect(result.success).toBe(true)
  })
  it('rejects invalid email', () => {
    const result = CreateClientSchema.safeParse({ name: 'ACME', email: 'not-an-email' })
    expect(result.success).toBe(false)
  })
})

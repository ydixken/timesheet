export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function formatDecimalHours(minutes: number): string {
  return (minutes / 60).toFixed(1)
}

export function formatTimeRange(start: string | null, end: string | null): string {
  if (!start || !end) return ''
  const s = start.length > 5 ? start.slice(0, 5) : start
  const e = end.length > 5 ? end.slice(0, 5) : end
  return `${s} – ${e}`
}

export function parseHoursToMinutes(input: string): number | null {
  // Handle "6:30" -> 390 (check HH:MM first, before parseFloat eats the colon)
  const match = input.match(/^(\d+):(\d{2})$/)
  if (match) return parseInt(match[1]) * 60 + parseInt(match[2])
  // Handle "6.5", "6,5" -> 390
  const decimal = parseFloat(input.replace(',', '.'))
  if (!isNaN(decimal) && decimal > 0) return Math.round(decimal * 60)
  return null
}

export function getWeekDates(refDate: Date): { start: string; end: string; dates: string[] } {
  const d = new Date(refDate)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(d)
  monday.setDate(diff)

  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    dates.push(date.toISOString().split('T')[0])
  }

  return { start: dates[0], end: dates[6], dates }
}

export function getMonthDates(year: number, month: number): { start: string; end: string; dates: string[] } {
  const lastDay = new Date(year, month, 0).getDate()
  const dates: string[] = []
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month - 1, d)
    dates.push(date.toISOString().split('T')[0])
  }
  return { start: dates[0], end: dates[dates.length - 1], dates }
}

export function formatDateHeading(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00') // noon to avoid timezone issues
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const dateNoon = new Date(dateStr + 'T12:00:00')
  if (dateNoon.toDateString() === today.toDateString()) return 'Today'
  if (dateNoon.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function groupEntriesByDate<T extends { date: string }>(entries: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>()
  for (const entry of entries) {
    const existing = grouped.get(entry.date) || []
    existing.push(entry)
    grouped.set(entry.date, existing)
  }
  return grouped
}

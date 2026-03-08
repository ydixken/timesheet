export interface ParsedQuickEntry {
  durationMin: number
  projectQuery: string
  description: string
}

const DURATION_PATTERNS = [
  { regex: /^(\d+)h(\d+)m/, parse: (m: RegExpMatchArray) => Number(m[1]) * 60 + Number(m[2]) },
  { regex: /^(\d+):(\d{2})/, parse: (m: RegExpMatchArray) => Number(m[1]) * 60 + Number(m[2]) },
  { regex: /^(\d+\.?\d*)h/, parse: (m: RegExpMatchArray) => Math.round(Number(m[1]) * 60) },
  { regex: /^(\d+)m/, parse: (m: RegExpMatchArray) => Number(m[1]) },
] as const

export function parseQuickEntry(input: string): ParsedQuickEntry | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  for (const { regex, parse } of DURATION_PATTERNS) {
    const match = trimmed.match(regex)
    if (!match) continue

    const durationMin = parse(match)
    const remainder = trimmed.slice(match[0].length).trim()
    const pipeIndex = remainder.indexOf('|')

    const projectQuery = pipeIndex === -1
      ? remainder.trim()
      : remainder.slice(0, pipeIndex).trim()

    if (!projectQuery) return null

    const description = pipeIndex === -1
      ? ''
      : remainder.slice(pipeIndex + 1).trim()

    return { durationMin, projectQuery, description }
  }

  return null
}

export function matchProject<T extends { name: string }>(
  query: string,
  projects: T[],
): T | null {
  const lower = query.toLowerCase()
  return projects.find((p) => p.name.toLowerCase().includes(lower)) ?? null
}

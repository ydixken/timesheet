export const ROUNDING_OPTIONS = [5, 10, 15, 30] as const
export type RoundingMinutes = (typeof ROUNDING_OPTIONS)[number]

export function roundMinutes(minutes: number, roundTo: number): number {
  if (roundTo <= 0) return minutes
  return Math.round(minutes / roundTo) * roundTo
}

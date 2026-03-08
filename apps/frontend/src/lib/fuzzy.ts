interface FuzzyMatch<T> { item: T; score: number }

export function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  const words = q.split(/\s+/).filter(Boolean)
  if (words.length === 0) return 0

  let score = 0
  for (const word of words) {
    const idx = t.indexOf(word)
    if (idx === -1) return 0 // all words must match
    score += word.length / t.length // longer match = higher score
    if (idx === 0 || t[idx - 1] === ' ') score += 0.5 // prefix/word-boundary bonus
  }
  return score
}

export function fuzzySearch<T>(
  query: string,
  items: T[],
  accessor: (item: T) => string,
  limit = 8,
): FuzzyMatch<T>[] {
  if (!query || query.length < 2) return []

  const results: FuzzyMatch<T>[] = []
  for (const item of items) {
    const score = fuzzyMatch(query, accessor(item))
    if (score > 0) results.push({ item, score })
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit)
}

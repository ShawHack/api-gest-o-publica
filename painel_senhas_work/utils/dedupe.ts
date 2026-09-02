import { callDedupeKey, type DisplayCall } from '../types/call'

export function dedupeCalls(records: DisplayCall[]): DisplayCall[] {
  const seen = new Set<string>()
  return records.filter((record) => {
    const key = callDedupeKey(record)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function isSameCall(a: DisplayCall | null, b: DisplayCall | null): boolean {
  if (!a || !b) return false
  if (a.id === b.id) return true
  return callDedupeKey(a) === callDedupeKey(b)
}

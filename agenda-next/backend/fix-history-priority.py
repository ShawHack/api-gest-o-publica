#!/usr/bin/env python3
"""Histórico: chamadas AG locais primeiro, ADS depois."""
from pathlib import Path

src = Path('/home/semit/painel-semit/src/utils/history.ts')
content = src.read_text(encoding='utf-8')

old_fn = """export function buildCallHistory(
  incoming: DisplayCall[],
  current: DisplayCall | null,
  size: number,
  previousHistory: DisplayCall[] = [],
): DisplayCall[] {
  if (!current || size <= 0) return []

  const others = incoming.filter((item) => item.id !== current.id)

  const otherTickets = dedupeCalls(others).filter((item) => !isSameCall(item, current))
  if (otherTickets.length > 0) {
    const keys = new Set(otherTickets.map((item) => callDedupeKey(item)))
    const extras = previousHistory.filter(
      (item) =>
        item.id !== current.id &&
        !keys.has(callDedupeKey(item)) &&
        !isSameCall(item, current),
    )
    return [...otherTickets, ...extras].slice(0, size)
  }

  if (others.length > 0) {
    return others.slice(0, size)
  }

  return previousHistory.filter((item) => item.id !== current.id).slice(0, size)
}"""

new_fn = """export function buildCallHistory(
  incoming: DisplayCall[],
  current: DisplayCall | null,
  size: number,
  previousHistory: DisplayCall[] = [],
): DisplayCall[] {
  if (!current || size <= 0) return []

  const others = incoming.filter((item) => item.id !== current.id)
  const apiOthers = dedupeCalls(others).filter((item) => !isSameCall(item, current))

  const seen = new Set<string>()
  const merged: DisplayCall[] = []

  const push = (item: DisplayCall) => {
    if (isSameCall(item, current)) return
    const key = callDedupeKey(item)
    if (seen.has(key)) return
    seen.add(key)
    merged.push(item)
  }

  for (const item of previousHistory) {
    if (merged.length >= size) break
    push(item)
  }
  for (const item of apiOthers) {
    if (merged.length >= size) break
    push(item)
  }

  return merged.slice(0, size)
}"""

if old_fn in content:
    src.write_text(content.replace(old_fn, new_fn), encoding='utf-8')
    print('buildCallHistory updated')
else:
    print('buildCallHistory skip')

#!/usr/bin/env python3
"""Histórico local: ao trocar senha em destaque, guarda a anterior (agenda AG)."""
from pathlib import Path

history = Path('/home/semit/painel-semit/src/utils/history.ts')
text = history.read_text(encoding='utf-8')

old = """  const featured = incoming[0]!
  const history = buildCallHistory(incoming, featured, size, state.history)

  if (!initialized || !state.current) {"""

new = """  const featured = incoming[0]!
  let seedHistory = state.history

  if (initialized && state.current) {
    const previous = state.current
    if (featured.id !== previous.id) {
      if (isSameCall(featured, previous)) {
        if (featured.id > previous.id) {
          seedHistory = [previous, ...seedHistory.filter((item) => item.id !== previous.id)].slice(0, size)
        }
      } else {
        seedHistory = prependHistory(previous, seedHistory, size)
      }
    }
  }

  const history = buildCallHistory(incoming, featured, size, seedHistory)

  if (!initialized || !state.current) {"""

if old in text:
    history.write_text(text.replace(old, new), encoding='utf-8')
    print('history.ts patched')
else:
    print('history.ts skip - already patched or different version')

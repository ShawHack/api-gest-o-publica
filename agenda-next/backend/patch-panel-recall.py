#!/usr/bin/env python3
"""Melhora detecção de rechamada e transição agenda -> NovoSGA no painel TV."""
from pathlib import Path

path = Path('/home/semit/painel-semit/src/utils/history.ts')
content = path.read_text(encoding='utf-8')

old_fn = """function isNewerCall(item: DisplayCall, previous: DisplayCall): boolean {
  if (item.id > previous.id) return true
  if (isSameCall(item, previous) && item.id > previous.id) return true
  // Agenda usa Date.now() como id; NovoSGA usa ids pequenos
  if (previous.id >= AGENDA_ID_THRESHOLD && item.id < AGENDA_ID_THRESHOLD && !isSameCall(item, previous)) {
    return true
  }
  return false
}"""

new_fn = """function callTimeMs(call: DisplayCall): number {
  const fromDate = Date.parse(call.calledAt || '')
  if (Number.isFinite(fromDate)) return fromDate
  if (call.id >= AGENDA_ID_THRESHOLD) return call.id
  return 0
}

function isNewerCall(item: DisplayCall, previous: DisplayCall): boolean {
  if (item.id > previous.id) return true
  if (isSameCall(item, previous)) {
    if (item.id > previous.id) return true
    return callTimeMs(item) > callTimeMs(previous)
  }
  // Agenda (id grande) -> senha NovoSGA (id pequeno)
  if (previous.id >= AGENDA_ID_THRESHOLD && item.id < AGENDA_ID_THRESHOLD) return true
  // Agenda expirou (>3 min): NovoSGA pode assumir
  if (item.id < AGENDA_ID_THRESHOLD && previous.priorityName === 'Agendamento Web') {
    const age = Date.now() - callTimeMs(previous)
    if (age > 180_000) return true
  }
  return false
}"""

if 'function callTimeMs' not in content:
    if old_fn not in content:
        raise SystemExit('isNewerCall block not found')
    content = content.replace(old_fn, new_fn)
    path.write_text(content, encoding='utf-8')
    print('history.ts updated')
else:
    print('history.ts already updated')

#!/usr/bin/env python3
"""Corrige history.ts no painel: senhas da agenda não bloqueiam mais o NovoSGA."""
from pathlib import Path

path = Path('/home/semit/painel-semit/src/utils/history.ts')
content = path.read_text(encoding='utf-8')

helper = """
const AGENDA_ID_THRESHOLD = 1_000_000_000

function isNewerCall(item: DisplayCall, previous: DisplayCall): boolean {
  if (item.id > previous.id) return true
  if (isSameCall(item, previous) && item.id > previous.id) return true
  // Agenda usa Date.now() como id; NovoSGA usa ids pequenos
  if (previous.id >= AGENDA_ID_THRESHOLD && item.id < AGENDA_ID_THRESHOLD && !isSameCall(item, previous)) {
    return true
  }
  return false
}

"""

if 'AGENDA_ID_THRESHOLD' not in content:
    anchor = "export interface CallBoardState"
    content = content.replace(anchor, helper + anchor)

content = content.replace(
    '  const newer = incoming.filter((item) => item.id > previous.id)',
    '  let newer = incoming.filter((item) => isNewerCall(item, previous))\n'
    '  if (!newer.length && incoming[0] && !isSameCall(incoming[0], previous)) {\n'
    '    const stillListed = incoming.some((item) => item.id === previous.id)\n'
    '    if (!stillListed || previous.id >= AGENDA_ID_THRESHOLD) {\n'
    '      newer = [incoming[0]]\n'
    '    }\n'
    '  }',
)

path.write_text(content, encoding='utf-8')
print('history.ts patched ok')

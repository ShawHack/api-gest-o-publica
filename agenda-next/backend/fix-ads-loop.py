#!/usr/bin/env python3
"""Corrige loop de voz: mesma senha não reanuncia a cada poll."""
from pathlib import Path

history = Path('/home/semit/painel-semit/src/utils/history.ts')
adapter = Path('/home/semit/painel-semit/src/services/api/adapters/painelSenhaAdapter.ts')
cm = Path('/home/semit/painel-semit/src/services/realtime/connectionManager.ts')

h = history.read_text(encoding='utf-8')
old = """  if (isSameCall(item, previous)) {
    if (item.id > previous.id) return true
    return callTimeMs(item) > callTimeMs(previous)
  }"""
new = """  if (isSameCall(item, previous)) {
    // Rechamada só quando o id do evento aumenta (evita loop no polling)
    return item.id > previous.id
  }"""
if old in h:
    h = h.replace(old, new)
    history.write_text(h, encoding='utf-8')
    print('history.ts fixed')
else:
    print('history.ts skip')

a = adapter.read_text(encoding='utf-8')
a = a.replace(
    '  calledAt: string = new Date().toISOString(),',
    '  calledAt = \'\',',
)
if 'calledAt = \'\'' in a or "calledAt = ''" in a:
    adapter.write_text(a, encoding='utf-8')
    print('adapter fixed')

c = cm.read_text(encoding='utf-8')
if 'private startPolling(): void {' in c and 'this.clearBackgroundPolling()' not in c.split('private startPolling(): void {')[1][:200]:
    c = c.replace(
        '  private startPolling(): void {\n    this.mode = \'poll\'',
        '  private startPolling(): void {\n    this.clearBackgroundPolling()\n    this.mode = \'poll\'',
    )
    cm.write_text(c, encoding='utf-8')
    print('connectionManager fixed')

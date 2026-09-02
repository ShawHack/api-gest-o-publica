#!/usr/bin/env python3
"""Remove Invalid Date quando calledAt vazio."""
from pathlib import Path

fmt = Path('/home/semit/painel-semit/src/utils/format.ts')
cc = Path('/home/semit/painel-semit/src/features/display/CurrentCall.tsx')

f = fmt.read_text(encoding='utf-8')
old = """export function formatCallTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return '--:--:--'
  }
}"""
new = """export function formatCallTime(iso: string): string {
  if (!iso?.trim()) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  try {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ''
  }
}"""
if old in f:
    fmt.write_text(f.replace(old, new), encoding='utf-8')
    print('format.ts fixed')

c = cc.read_text(encoding='utf-8')
old2 = '        <span>{formatCallTime(call.calledAt)}</span>'
new2 = '        {formatCallTime(call.calledAt) ? <span>{formatCallTime(call.calledAt)}</span> : null}'
if old2 in c:
    cc.write_text(c.replace(old2, new2), encoding='utf-8')
    print('CurrentCall.tsx fixed')

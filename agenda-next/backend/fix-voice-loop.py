#!/usr/bin/env python3
"""Para loop ADS/AG: featured = incoming[0], voz só em id novo."""
from pathlib import Path

history = Path('/home/semit/painel-semit/src/utils/history.ts')
panel = Path('/home/semit/painel-semit/src/features/calls/PanelContext.tsx')

HISTORY_NEW = r'''import { callDedupeKey, type DisplayCall } from '../types/call'
import { dedupeCalls, isSameCall } from './dedupe'

export interface CallBoardState {
  current: DisplayCall | null
  history: DisplayCall[]
}

/**
 * Monta o histórico a exibir.
 * 1) Outras senhas da API (uma por ticket), sem a atual.
 * 2) Se a API só tiver rechamadas da atual, mostra esses eventos (ids anteriores).
 * 3) Se a API só trouxer a atual, preserva o histórico local.
 */
export function buildCallHistory(
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
}

/**
 * Aplica lista da API (mais recente primeiro) ao estado do painel.
 * A senha em destaque é sempre incoming[0] (merge já ordena por recência).
 * Voz só quando o id do destaque muda (nova senha ou rechamada).
 */
export function applyApiSnapshot(
  state: CallBoardState,
  incoming: DisplayCall[],
  historySize: number,
  initialized: boolean,
): { state: CallBoardState; newlyFeatured: DisplayCall[] } {
  const size = Math.max(0, historySize)
  if (!incoming.length) {
    return { state, newlyFeatured: [] }
  }

  const featured = incoming[0]!
  const history = buildCallHistory(incoming, featured, size, state.history)

  if (!initialized || !state.current) {
    return {
      state: { current: featured, history },
      newlyFeatured: [featured],
    }
  }

  const previous = state.current
  const newlyFeatured: DisplayCall[] = []

  if (featured.id !== previous.id) {
    if (isSameCall(featured, previous)) {
      if (featured.id > previous.id) {
        newlyFeatured.push(featured)
      }
    } else {
      newlyFeatured.push(featured)
    }
  }

  return {
    state: { current: featured, history },
    newlyFeatured,
  }
}

export function prependHistory(
  record: DisplayCall,
  history: DisplayCall[],
  historySize: number,
): DisplayCall[] {
  const key = callDedupeKey(record)
  return [record, ...history.filter((item) => callDedupeKey(item) !== key)].slice(0, historySize)
}

export function pushFeaturedCall(
  state: CallBoardState,
  next: DisplayCall,
  historySize: number,
): CallBoardState {
  if (state.current && state.current.id === next.id) {
    return { ...state, current: next }
  }

  if (isSameCall(state.current, next)) {
    const history = state.current
      ? [state.current, ...state.history.filter((item) => item.id !== state.current!.id)].slice(
          0,
          historySize,
        )
      : state.history
    return { current: next, history }
  }

  const history = state.current
    ? prependHistory(state.current, state.history, historySize)
    : state.history
  return { current: next, history }
}
'''

history.write_text(HISTORY_NEW, encoding='utf-8')
print('history.ts rewritten')

p = panel.read_text(encoding='utf-8')

if 'announcedIdsRef' not in p:
    p = p.replace(
        '  const fetchingRef = useRef(false)',
        '  const fetchingRef = useRef(false)\n  const announcedIdsRef = useRef(new Set<number>())',
    )

old_announce = '''  const announce = useCallback(
    (call: DisplayCall) => {
      const cfg = settingsRef.current
      if (!cfg.speechEnabled || !speechRef.current.isUnlocked()) return
      speechRef.current.enqueue({'''

new_announce = '''  const announce = useCallback(
    (call: DisplayCall) => {
      if (announcedIdsRef.current.has(call.id)) return
      announcedIdsRef.current.add(call.id)
      if (announcedIdsRef.current.size > 200) {
        const keep = [...announcedIdsRef.current].slice(-100)
        announcedIdsRef.current = new Set(keep)
      }
      const cfg = settingsRef.current
      if (!cfg.speechEnabled || !speechRef.current.isUnlocked()) return
      speechRef.current.enqueue({'''

if old_announce in p:
    p = p.replace(old_announce, new_announce)
    panel.write_text(p, encoding='utf-8')
    print('PanelContext.tsx patched')
else:
    print('PanelContext.tsx skip (already patched?)')

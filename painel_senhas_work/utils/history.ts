import { callDedupeKey, type DisplayCall } from '../types/call'
import { dedupeCalls, isSameCall } from './dedupe'

export interface CallBoardState {
  current: DisplayCall | null
  history: DisplayCall[]
}

/**
 * Monta histórico: chamadas locais (AG anteriores) primeiro, depois API (NovoSGA).
 */
export function buildCallHistory(
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

import {
  SESSION_ADMIN_UNLOCK_KEY,
  SESSION_AUTH_KEY,
  SESSION_CREDENTIALS_KEY,
} from '../../config/env'
import type { OAuthTokens, SessionCredentials } from '../../types/config'

export function loadTokens(): OAuthTokens | null {
  try {
    const raw = sessionStorage.getItem(SESSION_AUTH_KEY)
    if (!raw) return null
    return JSON.parse(raw) as OAuthTokens
  } catch {
    return null
  }
}

export function saveTokens(tokens: OAuthTokens | null): void {
  if (!tokens) {
    sessionStorage.removeItem(SESSION_AUTH_KEY)
    return
  }
  sessionStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(tokens))
}

export function loadCredentials(): SessionCredentials | null {
  try {
    const raw = sessionStorage.getItem(SESSION_CREDENTIALS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SessionCredentials
  } catch {
    return null
  }
}

export function saveCredentials(credentials: SessionCredentials | null): void {
  if (!credentials) {
    sessionStorage.removeItem(SESSION_CREDENTIALS_KEY)
    return
  }
  sessionStorage.setItem(SESSION_CREDENTIALS_KEY, JSON.stringify(credentials))
}

export function isAdminUnlocked(): boolean {
  return sessionStorage.getItem(SESSION_ADMIN_UNLOCK_KEY) === '1'
}

export function setAdminUnlocked(value: boolean): void {
  if (value) {
    sessionStorage.setItem(SESSION_ADMIN_UNLOCK_KEY, '1')
  } else {
    sessionStorage.removeItem(SESSION_ADMIN_UNLOCK_KEY)
  }
}

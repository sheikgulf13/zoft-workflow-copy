import Cookies from 'js-cookie'
import type { User } from './types'

export const ACCESS_COOKIE = 'zw_access'
export const USER_SESSION_KEY = 'zw_user'
const AUTH_EVENT_KEY = 'zw_auth_event'

export const persistSession = (
  user: User,
  accessToken: string,
  remember?: boolean
): void => {
  Cookies.set(ACCESS_COOKIE, accessToken, {
    secure: true,
    sameSite: 'strict',
    expires: remember ? 7 : undefined,
  })
  // Persist user in localStorage to unify across tabs
  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user))
  // Broadcast sign-in to other tabs (storage event)
  try { localStorage.setItem(AUTH_EVENT_KEY, JSON.stringify({ type: 'sign-in', at: Date.now() })) } catch { /* noop */ }
}

export const clearSession = (): void => {
  Cookies.remove(ACCESS_COOKIE)
  localStorage.removeItem(USER_SESSION_KEY)
  // Broadcast sign-out to other tabs
  try { localStorage.setItem(AUTH_EVENT_KEY, JSON.stringify({ type: 'sign-out', at: Date.now() })) } catch { /* noop */ }
}

export const readSession = (): { user: User | null; accessToken: string | null } => {
  const token = Cookies.get(ACCESS_COOKIE) ?? null
  const userStr = localStorage.getItem(USER_SESSION_KEY)
  const user = userStr ? safeJsonParse<User>(userStr) : null
  return { user, accessToken: token }
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}



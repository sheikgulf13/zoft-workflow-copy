import Cookies from 'js-cookie'
import type { User } from './types'

export const ACCESS_COOKIE = 'zw_access'
const USER_SESSION_KEY = 'zw_user'

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
  sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(user))
}

export const clearSession = (): void => {
  Cookies.remove(ACCESS_COOKIE)
  sessionStorage.removeItem(USER_SESSION_KEY)
}

export const readSession = (): { user: User | null; accessToken: string | null } => {
  const token = Cookies.get(ACCESS_COOKIE) ?? null
  const userStr = sessionStorage.getItem(USER_SESSION_KEY)
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



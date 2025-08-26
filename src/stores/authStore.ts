import { create } from 'zustand'
import Cookies from 'js-cookie'

type User = {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

type AuthState = {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  signIn: (payload: { user: User; accessToken: string; remember?: boolean }) => void
  signUp: (payload: { user: User; accessToken: string; remember?: boolean }) => void
  signOut: () => void
  restoreSession: () => void
}

const ACCESS_COOKIE = 'zw_access'

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  signIn: ({ user, accessToken, remember }) => {
    set({ user, accessToken, isAuthenticated: true })
    Cookies.set(ACCESS_COOKIE, accessToken, {
      secure: true,
      sameSite: 'strict',
      expires: remember ? 7 : undefined,
    })
    sessionStorage.setItem('zw_user', JSON.stringify(user))
  },
  signUp: ({ user, accessToken, remember }) => {
    get().signIn({ user, accessToken, remember })
  },
  signOut: () => {
    Cookies.remove(ACCESS_COOKIE)
    sessionStorage.removeItem('zw_user')
    set({ user: null, accessToken: null, isAuthenticated: false })
  },
  restoreSession: () => {
    const token = Cookies.get(ACCESS_COOKIE) ?? null
    const userStr = sessionStorage.getItem('zw_user')
    const user: User | null = userStr ? safeJsonParse(userStr) : null
    if (token && user) {
      set({ user, accessToken: token, isAuthenticated: true })
    }
  },
}))

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}




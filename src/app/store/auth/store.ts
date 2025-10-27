import { create } from 'zustand'
import type { AuthActions, AuthState, AuthStore, SignInPayload } from './types'
import { clearSession, persistSession, readSession, USER_SESSION_KEY } from './persistence'

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
}

type SetState<T> = {
  (partial: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: false): void
  (state: T | ((state: T) => T), replace: true): void
}

const createActions = (
  set: SetState<AuthStore>,
  get: () => AuthStore
): AuthActions => ({
  signIn: ({ user, accessToken, remember }: SignInPayload) => {
    set({ user, accessToken, isAuthenticated: true })
    persistSession(user, accessToken, remember)
  },
  signUp: ({ user, accessToken, remember }: SignInPayload) => {
    get().signIn({ user, accessToken, remember })
  },
  signOut: () => {
    clearSession()
    set({ user: null, accessToken: null, isAuthenticated: false })
  },
  restoreSession: () => {
    const { user, accessToken } = readSession()
    if (user && accessToken) {
      set({ user, accessToken, isAuthenticated: true })
    }
  },
})

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...initialState,
  ...createActions(set, get as () => AuthStore),
}))

// Cross-tab session sync: listen to storage events
try {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === USER_SESSION_KEY) {
      // User object changed (sign-in/out in another tab)
      const { user, accessToken } = readSession()
      if (user && accessToken) {
        useAuthStore.setState({ user, accessToken, isAuthenticated: true })
      } else {
        useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false })
      }
    }
    if (e.key === 'zw_auth_event') {
      const { user, accessToken } = readSession()
      if (user && accessToken) {
        useAuthStore.setState({ user, accessToken, isAuthenticated: true })
      } else {
        useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false })
      }
    }
  })
} catch { /* noop */ }



export type User = {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

export type SignInPayload = {
  user: User
  accessToken: string
  remember?: boolean
}

export type SignUpPayload = SignInPayload

export type AuthState = {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
}

export type AuthActions = {
  signIn: (payload: SignInPayload) => void
  signUp: (payload: SignUpPayload) => void
  signOut: () => void
  restoreSession: () => void
}

export type AuthStore = AuthState & AuthActions



import type { AuthStore } from './types'

export const selectUser = (state: AuthStore) => state.user
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated
export const selectAccessToken = (state: AuthStore) => state.accessToken



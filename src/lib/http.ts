import axios from 'axios'
import Cookies from 'js-cookie'

const ACCESS_COOKIE = 'zw_access'

const env = import.meta.env as Record<string, string | undefined>
const rawBackendUrl = env.VITE_BACKEND_API_URL || env.BACKEND_API_URL || ''
const resolvedBaseUrl = rawBackendUrl
  ? `${rawBackendUrl.replace(/\/$/, '')}/api`
  : '/api'

export const http = axios.create({
  baseURL: resolvedBaseUrl,
  timeout: 20_000,
  //withCredentials: true,

})

http.interceptors.request.use((config) => {
  const url = config.url ?? ''
  
  // Do not send Authorization header to public auth endpoints
  if (url.includes('/api/auth/')) {
    return config
  }
  const token = Cookies.get(ACCESS_COOKIE)
  if (token) {
    config.headers = config.headers ?? {}
    config.headers['Authorization'] = `Bearer ${token}`
    config.headers['ngrok-skip-browser-warning'] = 'true'
  }
  return config
})

http.interceptors.response.use(
  (resp) => resp,
  (error) => {
    // Let components handle their own error messaging
    return Promise.reject(error)
  },
)




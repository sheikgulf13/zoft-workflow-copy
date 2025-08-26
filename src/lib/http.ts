import axios from 'axios'
import Cookies from 'js-cookie'

const ACCESS_COOKIE = 'zw_access'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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




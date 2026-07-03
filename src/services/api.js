import axios from 'axios'

function resolveBaseURL() {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim()
  if (fromEnv) return fromEnv
  if (import.meta.env.DEV) return 'http://localhost:8080'
  return ''
}

const api = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 15000,
})

api.interceptors.request.use(
  (config) => {
    try {
      const userStr = localStorage.getItem('auth_user')
      if (userStr) {
        const user = JSON.parse(userStr)
        if (user && user.id) {
          config.headers['X-Employee-Id'] = user.id
          config.headers['X-User-Id'] = user.id
        }
      }
    } catch (e) {
      console.error('Error attaching auth user headers', e)
    }
    return config
  },
  (error) => Promise.reject(error),
)

/**
 * Helper to check if a response is wrapped in the backend's ResponseObject envelope.
 * Backend returns { status: "200 OK", message: "...", data: {...} }
 * We unwrap it so consumers get `response.data` = the actual payload.
 */
const isResponseObject = (data) => {
  return data && typeof data === 'object' && 'status' in data && 'data' in data && 'message' in data
}

api.interceptors.response.use(
  (response) => {
    // Auto-unwrap ResponseObject wrapper from backend
    if (isResponseObject(response.data)) {
      const wrapper = response.data
      // Preserve the wrapper info as metadata
      response._wrapper = {
        status: wrapper.status,
        message: wrapper.message,
      }
      // Replace response.data with the actual data payload
      response.data = wrapper.data
    }
    return response
  },
  (error) => {
    // TODO: handle auth refresh and global errors here
    return Promise.reject(error)
  },
)

export default api


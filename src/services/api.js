import axios from 'axios'

function resolveBaseURL() {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim()

  if (fromEnv) {
    return fromEnv.endsWith('/api/v1')
      ? fromEnv
      : `${fromEnv.replace(/\/$/, '')}/api/v1`
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:8080/api/v1'
  }

  return '/api/v1'
}

const api = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    console.log('API Request:', `${config.baseURL}${config.url}`)
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error?.response?.data || error.message)
    return Promise.reject(error)
  },
)

export default api
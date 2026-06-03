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
    // TODO: attach auth token here
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // TODO: handle auth refresh and global errors here
    return Promise.reject(error)
  },
)

export default api

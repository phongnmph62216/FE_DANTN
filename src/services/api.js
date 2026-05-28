import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
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

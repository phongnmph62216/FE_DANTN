import { defineStore } from 'pinia'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('auth_user') || 'null'),
  }),
  getters: {
    isLoggedIn: (state) => state.user !== null,
    userRole: (state) => state.user?.role || null,
    isCustomer: (state) => state.user?.role === 'ROLE_KHACH_HANG',
    isEmployee: (state) => state.user?.role === 'ROLE_NHAN_VIEN',
    isManager: (state) => state.user?.role === 'ROLE_QUAN_LY',
    isAdminOrStaff: (state) => ['ROLE_NHAN_VIEN', 'ROLE_QUAN_LY'].includes(state.user?.role),
  },
  actions: {
    async login(username, password) {
      try {
        const response = await api.post('/api/v1/auth/login', { username, password })
        const userData = response.data
        this.user = userData
        localStorage.setItem('auth_user', JSON.stringify(userData))
        return userData
      } catch (error) {
        const msg = error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.'
        throw new Error(msg)
      }
    },
    async register(registerData) {
      try {
        await api.post('/api/v1/auth/register', registerData)
      } catch (error) {
        const msg = error.response?.data?.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại.'
        throw new Error(msg)
      }
    },
    logout() {
      this.user = null
      localStorage.removeItem('auth_user')
    }
  }
})

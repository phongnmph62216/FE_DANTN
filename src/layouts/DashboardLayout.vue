<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { formatCurrency as utilsFormatCurrency, formatDateTime as utilsFormatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Toast notification alert state
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

const showLogoutConfirmModal = ref(false)

const handleLogout = () => {
  showUserDropdown.value = false
  showLogoutConfirmModal.value = true
}

const confirmLogout = () => {
  showLogoutConfirmModal.value = false
  authStore.logout()
  router.push('/auth')
}

// Notifications state and functions
import { useNotificationStore } from '@/stores/notification'
import api from '@/services/api'

const notificationStore = useNotificationStore()

const notifications = computed(() => notificationStore.notifications)
const unreadCount = computed(() => notificationStore.unreadCount)
const showNotificationsPanel = ref(false)
const isRinging = ref(false)

const playNotificationSound = async () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume()
    }
    const playTone = (freq, startTime, duration) => {
      const osc = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)
      gainNode.gain.setValueAtTime(0.3, startTime)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
      osc.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      osc.start(startTime)
      osc.stop(startTime + duration)
    }
    const now = audioCtx.currentTime
    // Double-ding premium chime sound
    playTone(880, now, 0.4)
    playTone(1320, now + 0.15, 0.5)
  } catch (e) {
    console.error('AudioContext sound failed:', e)
  }
}

const triggerBellAlert = () => {
  isRinging.value = true
  playNotificationSound()
  setTimeout(() => {
    isRinging.value = false
  }, 5000)
}

watch(() => notificationStore.ringTrigger, (newVal) => {
  if (newVal > 0) {
    triggerBellAlert()
  }
})

let reminderInterval = null

const startReminderTimer = () => {
  if (reminderInterval) clearInterval(reminderInterval)
  const checkAndAlert = async () => {
    if (!authStore.isLoggedIn || !authStore.isAdminOrStaff) return
    try {
      await notificationStore.checkPendingOrders()
      if (notificationStore.pendingOrdersCount > 0) {
        console.log(`Reminder: there are ${notificationStore.pendingOrdersCount} orders pending confirmation. Shaking bell...`)
        triggerBellAlert()
      }
    } catch (e) {
      console.error('Error checking pending orders in reminder:', e)
    }
  }
  // Immediately check, then check every 2 minutes (120000ms)
  checkAndAlert()
  reminderInterval = setInterval(checkAndAlert, 120000)
}

const stopReminderTimer = () => {
  if (reminderInterval) {
    clearInterval(reminderInterval)
    reminderInterval = null
  }
}

watch(() => authStore.user, (newVal) => {
  if (newVal && authStore.isAdminOrStaff) {
    notificationStore.connectWs()
    startReminderTimer()
  } else {
    notificationStore.disconnectWs()
    stopReminderTimer()
  }
}, { deep: true, immediate: true })

const toggleNotificationsPanel = (event) => {
  event.stopPropagation()
  showNotificationsPanel.value = !showNotificationsPanel.value
}

const closeNotificationsPanel = () => {
  showNotificationsPanel.value = false
}

// User profile dropdown & Staff Profile Modal
const showUserDropdown = ref(false)
const showStaffProfileModal = ref(false)
const staffActiveTab = ref('profile') // 'profile', 'password', 'settings'
const isStaffProfileLoading = ref(false)
const isStaffProfileSubmitting = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const staffForm = ref({
  id: null,
  maNhanVien: '',
  hoVaTen: '',
  soDienThoai: '',
  email: '',
  cccd: '',
  gioiTinh: 1,
  ngaySinh: '',
  diaChi: '',
  idVaiTro: 1,
  tenVaiTro: ''
})

const staffPasswordForm = ref({
  newPassword: '',
  confirmPassword: ''
})

const settingsForm = ref({
  darkMode: false,
  soundAlert: true,
  language: 'vi'
})

watch(() => settingsForm.value.darkMode, (isDark) => {
  if (isDark) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('app_theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('app_theme', 'light')
  }
})

onMounted(() => {
  const savedTheme = localStorage.getItem('app_theme')
  if (savedTheme === 'dark') {
    settingsForm.value.darkMode = true
    document.documentElement.classList.add('dark')
  }
})

const toggleUserDropdown = (event) => {
  event.stopPropagation()
  showUserDropdown.value = !showUserDropdown.value
  showNotificationsPanel.value = false
}

const closeAllDropdowns = () => {
  showNotificationsPanel.value = false
  showUserDropdown.value = false
}

const openStaffProfileModal = async (tab = 'profile') => {
  staffActiveTab.value = tab
  showUserDropdown.value = false
  showStaffProfileModal.value = true

  // Sync fallback info from authStore.user to prevent blank input fields
  if (authStore.user) {
    staffForm.value.hoVaTen = authStore.user.hoTen || authStore.user.hoVaTen || staffForm.value.hoVaTen || ''
    staffForm.value.soDienThoai = authStore.user.sdt || authStore.user.soDienThoai || staffForm.value.soDienThoai || ''
    staffForm.value.email = authStore.user.email || staffForm.value.email || ''
    staffForm.value.tenVaiTro = authStore.user.tenVaiTro || (authStore.isManager ? 'Quản lý' : 'Nhân viên')
    staffForm.value.idVaiTro = authStore.isManager ? 1 : 2
  }

  const userId = authStore.user?.id || authStore.user?.idNhanVien || authStore.user?.userId
  if (!userId) return

  if (!staffForm.value.id && tab === 'profile') {
    isStaffProfileLoading.value = true
  }

  try {
    const res = await api.get(`/api/v1/nhan-vien/${userId}`)
    const data = res.data?.data || res.data
    if (data) {
      staffForm.value = {
        id: data.id,
        maNhanVien: data.maNhanVien || '',
        hoVaTen: data.hoVaTen || authStore.user?.hoTen || '',
        soDienThoai: data.soDienThoai || authStore.user?.sdt || '',
        email: data.email || authStore.user?.email || '',
        cccd: data.cccd || '',
        gioiTinh: data.gioiTinh !== undefined && data.gioiTinh !== null ? data.gioiTinh : 1,
        ngaySinh: data.ngaySinh || '',
        diaChi: data.diaChi || '',
        idVaiTro: data.vaiTro?.id || (authStore.isManager ? 1 : 2),
        tenVaiTro: data.vaiTro?.tenVaiTro || (authStore.isManager ? 'Quản lý' : 'Nhân viên')
      }
    }
  } catch (err) {
    console.error('Failed to load employee details:', err)
  } finally {
    isStaffProfileLoading.value = false
  }
}

const saveStaffProfile = async () => {
  if (!staffForm.value.hoVaTen || !staffForm.value.soDienThoai || !staffForm.value.email) {
    showToast('Vui lòng nhập đầy đủ Họ tên, Số điện thoại và Email!', 'error')
    return
  }

  const phoneRegex = /^(0[3|5|7|8|9])([0-9]{8})$/
  if (!phoneRegex.test(staffForm.value.soDienThoai)) {
    showToast('Số điện thoại không hợp lệ!', 'error')
    return
  }

  isStaffProfileSubmitting.value = true
  try {
    const userId = staffForm.value.id || authStore.user?.id || authStore.user?.idNhanVien || authStore.user?.userId
    const payload = {
      idVaiTro: staffForm.value.idVaiTro,
      hoVaTen: staffForm.value.hoVaTen,
      soDienThoai: staffForm.value.soDienThoai,
      email: staffForm.value.email,
      cccd: staffForm.value.cccd,
      gioiTinh: Number(staffForm.value.gioiTinh),
      ngaySinh: staffForm.value.ngaySinh || null,
      diaChi: staffForm.value.diaChi
    }

    if (userId) {
      await api.put(`/api/v1/nhan-vien/${userId}`, payload)
    }

    if (authStore.user) {
      authStore.user.hoTen = staffForm.value.hoVaTen
      authStore.user.sdt = staffForm.value.soDienThoai
      authStore.user.email = staffForm.value.email
      localStorage.setItem('auth_user', JSON.stringify(authStore.user))
    }

    showToast('Cập nhật thông tin cá nhân thành công!', 'success')
    showStaffProfileModal.value = false
  } catch (err) {
    console.error('Failed to update staff profile:', err)
    const msg = err.response?.data?.message || 'Cập nhật thất bại!'
    showToast(msg, 'error')
  } finally {
    isStaffProfileSubmitting.value = false
  }
}

const saveStaffPassword = async () => {
  if (!staffPasswordForm.value.newPassword) {
    showToast('Vui lòng nhập mật khẩu mới!', 'error')
    return
  }

  if (staffPasswordForm.value.newPassword.length < 6) {
    showToast('Mật khẩu phải có ít nhất 6 ký tự!', 'error')
    return
  }

  if (staffPasswordForm.value.newPassword !== staffPasswordForm.value.confirmPassword) {
    showToast('Xác nhận mật khẩu mới không trùng khớp!', 'error')
    return
  }

  isStaffProfileSubmitting.value = true
  try {
    const userId = staffForm.value.id || authStore.user?.id || authStore.user?.idNhanVien || authStore.user?.userId
    const payload = {
      idVaiTro: staffForm.value.idVaiTro || (authStore.isManager ? 1 : 2),
      hoVaTen: staffForm.value.hoVaTen || authStore.user?.hoTen || 'Nhân viên',
      soDienThoai: staffForm.value.soDienThoai || authStore.user?.sdt || '',
      email: staffForm.value.email || authStore.user?.email || '',
      cccd: staffForm.value.cccd || '',
      gioiTinh: Number(staffForm.value.gioiTinh ?? 1),
      ngaySinh: staffForm.value.ngaySinh || null,
      diaChi: staffForm.value.diaChi || '',
      matKhau: staffPasswordForm.value.newPassword
    }

    if (userId) {
      await api.put(`/api/v1/nhan-vien/${userId}`, payload)
    }

    showToast('Đổi mật khẩu tài khoản thành công!', 'success')
    staffPasswordForm.value.newPassword = ''
    staffPasswordForm.value.confirmPassword = ''
    showStaffProfileModal.value = false
  } catch (err) {
    console.error('Failed to change staff password:', err)
    const msg = err.response?.data?.message || 'Đổi mật khẩu thất bại!'
    showToast(msg, 'error')
  } finally {
    isStaffProfileSubmitting.value = false
  }
}

const handleNotificationClick = async (notif) => {
  try {
    await notificationStore.markAsRead(notif.id)
    if (notif.idHoaDon) {
      router.push(`/invoices/${notif.idHoaDon}`)
    } else {
      router.push('/admin/chat')
    }
    closeNotificationsPanel()
  } catch (error) {
    console.error('Error handling notification click:', error)
  }
}

const markAllAsRead = async () => {
  try {
    await notificationStore.markAllAsRead()
  } catch (error) {
    console.error('Error marking all as read:', error)
  }
}

const handleDeleteClick = async (id) => {
  try {
    await notificationStore.deleteNotification(id)
  } catch (error) {
    console.error('Error deleting notification:', error)
  }
}

const handleClearAll = async () => {
  try {
    await notificationStore.clearAllNotifications()
  } catch (error) {
    console.error('Error clearing all notifications:', error)
  }
}

const formatDate = (dateStr) => {
  return utilsFormatDateTime(dateStr)
}

const showOpenShiftModal = ref(false)
const shiftStatus = ref(null)
const currentOpenTime = ref('')
const startingCashInput = ref(0)
const isOpeningShift = ref(false)

const formatCurrency = (val) => {
  return utilsFormatCurrency(val)
}

const updateClock = () => {
  currentOpenTime.value = utilsFormatDateTime(new Date())
}

let clockInterval = null
const startClock = () => {
  updateClock()
  if (!clockInterval) {
    clockInterval = setInterval(updateClock, 1000)
  }
}
const stopClock = () => {
  if (clockInterval) {
    clearInterval(clockInterval)
    clockInterval = null
  }
}

const checkShiftStatus = async () => {
  if (!authStore.isLoggedIn || !authStore.isAdminOrStaff) return

  try {
    const res = await api.get('/api/v1/giao-ca/current-status')
    const statusData = res.data
    shiftStatus.value = statusData
    if (statusData && statusData.hasScheduleToday && statusData.status === 'NOT_OPENED') {
      showOpenShiftModal.value = true
      startingCashInput.value = statusData.previousShiftCash || 0
      startClock()
    } else {
      showOpenShiftModal.value = false
      stopClock()
    }
  } catch (error) {
    console.error('Error checking shift status:', error)
  }
}

const handleOpenShift = async () => {
  if (!shiftStatus.value || !shiftStatus.value.scheduleId) return
  isOpeningShift.value = true
  try {
    await api.post('/api/v1/giao-ca/mo-ca', {
      idLichLamViec: shiftStatus.value.scheduleId,
      tienMatDauCa: startingCashInput.value
    })
    showOpenShiftModal.value = false
    stopClock()
    showToast('Mở ca làm việc thành công!', 'success')
  } catch (error) {
    console.error('Error opening shift:', error)
    showToast(error.response?.data?.message || 'Có lỗi xảy ra khi mở ca làm việc.', 'error')
  } finally {
    isOpeningShift.value = false
  }
}

let pollInterval = null
onMounted(() => {
  notificationStore.fetchNotifications()
  pollInterval = setInterval(() => notificationStore.fetchNotifications(), 10000)
  document.addEventListener('click', closeAllDropdowns)
  checkShiftStatus()
  notificationStore.connectWs()
  if (authStore.isLoggedIn && authStore.isAdminOrStaff) {
    startReminderTimer()
  }
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  document.removeEventListener('click', closeAllDropdowns)
  stopClock()
  stopReminderTimer()
})

watch(() => route.path, (newPath) => {
  checkShiftStatus()
  if (newPath.startsWith('/orders') || newPath.startsWith('/invoices')) {
    menuStates.value.invoices = true
  }
})

// State to expand/collapse sidebar
const sidebarExpanded = ref(true)

// Menu expand/collapse states for collapsible sections
const menuStates = ref({
  invoices: route.path.startsWith('/orders') || route.path.startsWith('/invoices'),
  products: true,
  attributes: false,
  discounts: false,
  accounts: false,
  schedules: false
})

const toggleMenu = (menuKey) => {
  menuStates.value[menuKey] = !menuStates.value[menuKey]
}

const toggleSidebar = () => {
  sidebarExpanded.value = !sidebarExpanded.value
}

// Check active route to highlight menus
const isActiveRoute = (path) => {
  return route.path === path
}

const getImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
}
</script>

<template>
  <div class="bg-[#F8F9FA] text-on-background min-h-screen flex">
    <!-- SideNavBar -->
    <nav
      :class="sidebarExpanded ? 'w-[260px] px-gutter' : 'w-[80px] px-2'"
      class="fixed left-0 top-0 h-full bg-inverse-surface dark:bg-inverse-surface flex flex-col py-stack-lg border-r border-inverse-surface/10 z-20 transition-all duration-300 ease-in-out overflow-hidden"
    >
      <!-- Brand Logo -->
      <div class="flex items-center gap-3 mb-10 px-2 cursor-pointer group justify-center relative">
        <div
          :class="sidebarExpanded ? 'h-40 px-4' : 'h-12 px-0'"
          class="bg-transparent rounded-lg flex items-center justify-center overflow-hidden w-full transition-all duration-300"
        >
          <img
            :class="sidebarExpanded ? '' : 'scale-[1.5]'"
            alt="Bee Stylish Logo"
            class="max-w-full max-h-full object-contain transition-transform duration-300"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4uqyh-fOE8zAOM52ytCbca1y77XNRSHrDhCEAHb76ztg-XoW3dTx6gubyy-XcxgTguv_7ebWcnTK-UQLPw1eUmoTCyIlfNWZ6WfuQkhgv_bReMEXlrgmyRLnNvTEiu4TAG1XZr25M90KvstZcRoIyxgGXUkRt2ozPnRm16yrOaYQbKx_VtxhMJmKce77W3QzzxbkS0Bc8ghwbCKAtvVeyRZHDV9J6EEq6qNl2j29z_wZuNJlHRLJacBvCA20lxkVtZEA7GXNfM10"
          />
        </div>
      </div>

      <!-- Navigation Links -->
      <ul class="flex flex-col gap-1 flex-grow overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-surface-variant/20 scrollbar-track-transparent">
        <!-- Trang chủ (Active when route.path === '/admin') -->
        <li>
          <RouterLink
            to="/admin"
            :class="sidebarExpanded ? 'px-4' : 'px-0 justify-center'"
            class="flex items-center gap-3 py-3 rounded-lg font-bold transition-all shadow-sm"
            :style="isActiveRoute('/admin') ? 'background-image: linear-gradient(to right, #FFB74D, #EF972D); color: #ffffff;' : 'color: rgba(211, 228, 254, 0.8);'"
            :class-active="isActiveRoute('/admin') ? '' : 'hover:bg-surface-variant/10 hover:text-surface-bright'"
          >
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">dashboard</span>
            <span class="font-body-md text-body-md font-semibold whitespace-nowrap" v-show="sidebarExpanded">Trang chủ</span>
          </RouterLink>
        </li>

        <!-- Thống kê -->
        <li v-if="authStore.isManager">
          <RouterLink
            to="/admin/thong-ke"
            :class="sidebarExpanded ? 'px-4' : 'px-0 justify-center'"
            class="flex items-center gap-3 py-3 rounded-lg font-bold transition-all shadow-sm"
            :style="isActiveRoute('/admin/thong-ke') ? 'background-image: linear-gradient(to right, #FFB74D, #EF972D); color: #ffffff;' : 'color: rgba(211, 228, 254, 0.8);'"
            :class-active="isActiveRoute('/admin/thong-ke') ? '' : 'hover:bg-surface-variant/10 hover:text-surface-bright'"
          >
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">insights</span>
            <span class="font-body-md text-body-md font-semibold whitespace-nowrap" v-show="sidebarExpanded">Thống kê</span>
          </RouterLink>
        </li>

        <!-- Bán hàng -->
        <li>
          <RouterLink
            to="/pos"
            :class="sidebarExpanded ? 'px-4' : 'px-0 justify-center'"
            class="flex items-center gap-3 py-3 rounded-lg font-bold transition-all shadow-sm"
            :style="isActiveRoute('/pos') ? 'background-image: linear-gradient(to right, #FFB74D, #EF972D); color: #ffffff;' : 'color: rgba(211, 228, 254, 0.8);'"
            :class-active="isActiveRoute('/pos') ? '' : 'hover:bg-surface-variant/10 hover:text-surface-bright'"
          >
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">payments</span>
            <span class="font-body-md text-body-md font-semibold whitespace-nowrap" v-show="sidebarExpanded">Bán hàng</span>
          </RouterLink>
        </li>

        <!-- Collapsible Section -->
        <li class="mt-2">
          <p class="px-4 py-2 font-label-sm text-label-sm text-surface-variant/50 uppercase tracking-wider" v-show="sidebarExpanded">Quản lý</p>
          <div class="h-px w-8 mx-auto bg-surface-variant/20 my-3" v-show="!sidebarExpanded"></div>
        </li>

        <!-- Quản lý hóa đơn (Collapsible containing Đơn hàng & Hóa đơn) -->
        <li>
          <button
            :class="sidebarExpanded ? 'px-4' : 'px-0 justify-center'"
            @click="toggleMenu('invoices')"
            class="w-full flex items-center justify-between py-3 rounded-lg transition-colors group cursor-pointer"
            :style="isActiveRoute('/orders') || route.path.startsWith('/orders') || isActiveRoute('/invoices') || route.path.startsWith('/invoices') ? 'color: #EF972D; font-weight: 700;' : 'color: rgba(211, 228, 254, 0.8);'"
            :class-active="isActiveRoute('/orders') || route.path.startsWith('/orders') || isActiveRoute('/invoices') || route.path.startsWith('/invoices') ? '' : 'hover:bg-surface-variant/10 hover:text-surface-bright'"
          >
            <div :class="!sidebarExpanded && 'justify-center w-full'" class="flex items-center gap-3">
              <span class="material-symbols-outlined group-hover:scale-110 transition-transform">receipt_long</span>
              <span class="font-body-md text-body-md whitespace-nowrap" v-show="sidebarExpanded">Quản lý hóa đơn</span>
            </div>
            <span
              :class="menuStates.invoices ? 'rotate-180' : ''"
              class="material-symbols-outlined text-[18px] transition-transform duration-200"
              v-show="sidebarExpanded"
            >expand_more</span>
          </button>
          <div class="pl-11 pr-4 py-1 flex flex-col gap-1" v-show="menuStates.invoices && sidebarExpanded">
            <RouterLink
              to="/orders"
              class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
              :class="isActiveRoute('/orders') || route.path.startsWith('/orders') ? 'text-[#EF972D] font-semibold bg-surface-variant/10' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
            >
              Đơn hàng
            </RouterLink>
            <RouterLink
              to="/invoices"
              class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
              :class="isActiveRoute('/invoices') || route.path.startsWith('/invoices') ? 'text-[#EF972D] font-semibold bg-surface-variant/10' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
            >
              Hóa đơn
            </RouterLink>
          </div>
        </li>

        <!-- Quản lý sản phẩm (Collapsible) -->
        <li v-if="authStore.isManager">
          <button
            :class="sidebarExpanded ? 'px-4' : 'px-0 justify-center'"
            @click="toggleMenu('products')"
            class="w-full flex items-center justify-between py-3 text-surface-variant/80 hover:bg-surface-variant/10 hover:text-surface-bright rounded-lg transition-colors group cursor-pointer"
          >
            <div :class="!sidebarExpanded && 'justify-center w-full'" class="flex items-center gap-3">
              <span class="material-symbols-outlined group-hover:scale-110 transition-transform">inventory_2</span>
              <span class="font-body-md text-body-md whitespace-nowrap" v-show="sidebarExpanded">Quản lý sản phẩm</span>
            </div>
            <span
              :class="menuStates.products ? 'rotate-180' : ''"
              class="material-symbols-outlined text-[18px] transition-transform duration-200"
              v-show="sidebarExpanded"
            >expand_more</span>
          </button>
          <div class="pl-11 pr-4 py-1 flex flex-col gap-1" v-show="menuStates.products && sidebarExpanded">
            <RouterLink
              to="/products"
              class="py-2 font-semibold hover:bg-surface-variant/5 rounded-md px-3 font-body-md text-sm transition-colors block"
              :class="isActiveRoute('/products') ? 'text-[#EF972D]' : 'text-surface-variant/60 hover:text-surface-bright'"
            >
              Danh sách sản phẩm
            </RouterLink>
            <RouterLink
              to="/products/variants"
              class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
              :class="isActiveRoute('/products/variants') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
            >
              Biến thể sản phẩm
            </RouterLink>
          </div>
        </li>

        <!-- Danh sách thuộc tính (Collapsible) -->
        <li v-if="authStore.isManager">
          <button
            :class="sidebarExpanded ? 'px-4' : 'px-0 justify-center'"
            @click="toggleMenu('attributes')"
            class="w-full flex items-center justify-between py-3 text-surface-variant/80 hover:bg-surface-variant/10 hover:text-surface-bright rounded-lg transition-colors group cursor-pointer"
          >
            <div :class="!sidebarExpanded && 'justify-center w-full'" class="flex items-center gap-3">
              <span class="material-symbols-outlined group-hover:scale-110 transition-transform">format_list_bulleted</span>
              <span class="font-body-md text-body-md whitespace-nowrap" v-show="sidebarExpanded">Danh sách thuộc tính</span>
            </div>
            <span
              :class="menuStates.attributes ? 'rotate-180' : ''"
              class="material-symbols-outlined text-[18px] transition-transform duration-200"
              v-show="sidebarExpanded"
            >expand_more</span>
          </button>
          <div class="pl-11 pr-4 py-1 flex flex-col gap-1" v-show="menuStates.attributes && sidebarExpanded">
            <RouterLink
              to="/attributes/chat-lieu"
              class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
              :class="isActiveRoute('/attributes/chat-lieu') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
            >
              Chất liệu
            </RouterLink>
            <RouterLink
              to="/attributes/xuat-xu"
              class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
              :class="isActiveRoute('/attributes/xuat-xu') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
            >
              Xuất xứ
            </RouterLink>
            <RouterLink
              to="/attributes/loai-san-pham"
              class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
              :class="isActiveRoute('/attributes/loai-san-pham') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
            >
              Loại sản phẩm
            </RouterLink>
            <RouterLink
              to="/attributes/thuong-hieu"
              class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
              :class="isActiveRoute('/attributes/thuong-hieu') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
            >
              Thương hiệu
            </RouterLink>
            <RouterLink
              to="/attributes/kieu-dang"
              class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
              :class="isActiveRoute('/attributes/kieu-dang') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
            >
              Kiểu dáng
            </RouterLink>
            <RouterLink
              to="/attributes/co-ao"
              class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
              :class="isActiveRoute('/attributes/co-ao') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
            >
              Cổ áo
            </RouterLink>
            <RouterLink
              to="/attributes/tay-ao"
              class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
              :class="isActiveRoute('/attributes/tay-ao') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
            >
              Tay áo
            </RouterLink>
            <RouterLink
              to="/attributes/vai-ao"
              class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
              :class="isActiveRoute('/attributes/vai-ao') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
            >
              Vai áo
            </RouterLink>
            <RouterLink
              to="/attributes/mau-sac"
              class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
              :class="isActiveRoute('/attributes/mau-sac') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
            >
              Màu sắc
            </RouterLink>
            <RouterLink
              to="/attributes/kich-thuoc"
              class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
              :class="isActiveRoute('/attributes/kich-thuoc') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
            >
              Kích thước
            </RouterLink>
          </div>
        </li>

        <!-- Quản lý giảm giá (Collapsible) -->
        <li v-if="authStore.isManager">
          <button
            :class="sidebarExpanded ? 'px-4' : 'px-0 justify-center'"
            @click="toggleMenu('discounts')"
            class="w-full flex items-center justify-between py-3 text-surface-variant/80 hover:bg-surface-variant/10 hover:text-surface-bright rounded-lg transition-colors group cursor-pointer"
          >
            <div :class="!sidebarExpanded && 'justify-center w-full'" class="flex items-center gap-3">
              <span class="material-symbols-outlined group-hover:scale-110 transition-transform">local_offer</span>
              <span class="font-body-md text-body-md whitespace-nowrap" v-show="sidebarExpanded">Quản lý giảm giá</span>
            </div>
            <span
              :class="menuStates.discounts ? 'rotate-180' : ''"
              class="material-symbols-outlined text-[18px] transition-transform duration-200"
              v-show="sidebarExpanded"
            >expand_more</span>
          </button>
          <div class="pl-11 pr-4 py-1 flex flex-col gap-1" v-show="menuStates.discounts && sidebarExpanded">
            <RouterLink
              to="/vouchers"
              class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
              :class="isActiveRoute('/vouchers') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
            >
              Phiếu giảm giá
            </RouterLink>
            <RouterLink
              to="/discounts"
              class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
              :class="isActiveRoute('/discounts') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
            >
              Đợt giảm giá
            </RouterLink>
          </div>
        </li>

        <!-- Quản lý tài khoản (Collapsible) - Manager Only -->
        <li v-if="authStore.isManager">
          <button
            :class="sidebarExpanded ? 'px-4' : 'px-0 justify-center'"
            @click="toggleMenu('accounts')"
            class="w-full flex items-center justify-between py-3 text-surface-variant/80 hover:bg-surface-variant/10 hover:text-surface-bright rounded-lg transition-colors group cursor-pointer"
          >
            <div :class="!sidebarExpanded && 'justify-center w-full'" class="flex items-center gap-3">
              <span class="material-symbols-outlined group-hover:scale-110 transition-transform">group</span>
              <span class="font-body-md text-body-md whitespace-nowrap" v-show="sidebarExpanded">Quản lý tài khoản</span>
            </div>
            <span
              :class="menuStates.accounts ? 'rotate-180' : ''"
              class="material-symbols-outlined text-[18px] transition-transform duration-200"
              v-show="sidebarExpanded"
            >expand_more</span>
          </button>
          <div class="pl-11 pr-4 py-1 flex flex-col gap-1" v-show="menuStates.accounts && sidebarExpanded">
            <RouterLink
              to="/customers"
              class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
              :class="isActiveRoute('/customers') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
            >
              Khách hàng
            </RouterLink>
            <RouterLink
              to="/employees"
              class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
              :class="isActiveRoute('/employees') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
            >
              Nhân viên
            </RouterLink>
          </div>
        </li>

        <!-- Khách hàng - Employee Only -->
        <li v-if="authStore.isEmployee">
          <RouterLink
            to="/customers"
            :class="sidebarExpanded ? 'px-4' : 'px-0 justify-center'"
            class="flex items-center gap-3 py-3 rounded-lg font-bold transition-all shadow-sm"
            :style="isActiveRoute('/customers') || route.path.startsWith('/customers') ? 'background-image: linear-gradient(to right, #FFB74D, #EF972D); color: #ffffff;' : 'color: rgba(211, 228, 254, 0.8);'"
            :class-active="isActiveRoute('/customers') || route.path.startsWith('/customers') ? '' : 'hover:bg-surface-variant/10 hover:text-surface-bright'"
          >
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">group</span>
            <span class="font-body-md text-body-md font-semibold whitespace-nowrap" v-show="sidebarExpanded">Khách hàng</span>
          </RouterLink>
        </li>

        <!-- Lịch làm việc (Collapsible) -->
        <li>
          <button
            :class="sidebarExpanded ? 'px-4' : 'px-0 justify-center'"
            @click="toggleMenu('schedules')"
            class="w-full flex items-center justify-between py-3 text-surface-variant/80 hover:bg-surface-variant/10 hover:text-surface-bright rounded-lg transition-colors group cursor-pointer"
          >
            <div :class="!sidebarExpanded && 'justify-center w-full'" class="flex items-center gap-3">
              <span class="material-symbols-outlined group-hover:scale-110 transition-transform">calendar_today</span>
              <span class="font-body-md text-body-md whitespace-nowrap" v-show="sidebarExpanded">Lịch làm việc</span>
            </div>
            <span
              :class="menuStates.schedules ? 'rotate-180' : ''"
              class="material-symbols-outlined text-[18px] transition-transform duration-200"
              v-show="sidebarExpanded"
            >expand_more</span>
          </button>
          <div class="pl-11 pr-4 py-1 flex flex-col gap-1" v-show="menuStates.schedules && sidebarExpanded">
            <!-- Cho nhân viên -->
            <template v-if="authStore.isEmployee">
              <RouterLink
                to="/admin/lich-lam-viec-cua-toi"
                class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
                :class="isActiveRoute('/admin/lich-lam-viec-cua-toi') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
              >
                Lịch của tôi
              </RouterLink>
              <RouterLink
                to="/admin/giao-ca"
                class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
                :class="isActiveRoute('/admin/giao-ca') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
              >
                Giao ca
              </RouterLink>
              <RouterLink
                to="/admin/ke-toan"
                class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
                :class="isActiveRoute('/admin/ke-toan') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
              >
                Kế toán
              </RouterLink>
            </template>
            <!-- Cho quản lý -->
            <template v-else>
              <RouterLink
                to="/admin/lich-lam-viec"
                class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
                :class="isActiveRoute('/admin/lich-lam-viec') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
              >
                Lịch làm việc
              </RouterLink>
              <RouterLink
                to="/admin/ca-lam-viec"
                class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
                :class="isActiveRoute('/admin/ca-lam-viec') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
              >
                Ca làm việc
              </RouterLink>
              <RouterLink
                to="/admin/lich-su-hoat-dong"
                class="py-2 rounded-md px-3 font-body-md text-sm transition-colors block"
                :class="isActiveRoute('/admin/lich-su-hoat-dong') ? 'text-[#EF972D] font-semibold' : 'text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5'"
              >
                Lịch sử hoạt động
              </RouterLink>
            </template>
          </div>
        </li>

        <!-- Quản lý Chat -->
        <li>
          <RouterLink
            to="/admin/chat"
            :class="sidebarExpanded ? 'px-4' : 'px-0 justify-center'"
            class="flex items-center gap-3 py-3 rounded-lg font-bold transition-all shadow-sm"
            :style="isActiveRoute('/admin/chat') ? 'background-image: linear-gradient(to right, #FFB74D, #EF972D); color: #ffffff;' : 'color: rgba(211, 228, 254, 0.8);'"
            :class-active="isActiveRoute('/admin/chat') ? '' : 'hover:bg-surface-variant/10 hover:text-surface-bright'"
          >
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">chat</span>
            <span class="font-body-md text-body-md font-semibold whitespace-nowrap" v-show="sidebarExpanded">Quản lý Chat</span>
          </RouterLink>
        </li>
      </ul>

      <!-- Footer Action -->
      <div class="mt-auto pt-6 border-t border-surface-variant/10 flex flex-col gap-2">
        <button
          @click="toggleSidebar"
          :class="sidebarExpanded ? 'px-4' : 'px-0'"
          class="w-full flex items-center justify-center gap-2 py-3 text-surface-variant/80 hover:text-surface-bright rounded-lg transition-colors group"
        >
          <span class="material-symbols-outlined transition-transform">
            {{ sidebarExpanded ? 'chevron_left' : 'chevron_right' }}
          </span>
          <span class="font-body-md whitespace-nowrap" v-show="sidebarExpanded">Thu gọn</span>
        </button>
        <button
          @click="handleLogout"
          :class="sidebarExpanded ? 'px-4' : 'px-0'"
          class="w-full flex items-center justify-center gap-2 py-3 bg-surface-variant/10 hover:bg-surface-variant/20 text-surface-bright rounded-lg transition-colors font-body-md font-semibold group cursor-pointer"
        >
          <span class="material-symbols-outlined group-hover:-translate-x-1 transition-transform">logout</span>
          <span class="whitespace-nowrap" v-show="sidebarExpanded">Đăng xuất</span>
        </button>
      </div>
    </nav>

    <!-- Main Content Wrapper -->
    <div
      :class="sidebarExpanded ? 'ml-[260px]' : 'ml-[80px]'"
      class="flex-1 flex flex-col min-h-screen relative transition-all duration-300 ease-in-out"
    >
      <!-- Top Navigation Header Bar -->
      <header 
        :style="{ left: sidebarExpanded ? 'var(--spacing-sidebar-width)' : '80px' }"
        class="fixed top-0 right-0 h-16 bg-surface-container-lowest flex items-center justify-end px-container-padding z-50 border-b border-surface-container shadow-sm transition-all duration-300 ease-in-out"
      >
        <div class="flex items-center gap-6">
          <!-- Actions -->
          <div class="flex items-center gap-2 relative">
            <button 
              @click.stop="toggleNotificationsPanel"
              class="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-all cursor-pointer relative group flex items-center justify-center"
            >
              <span :class="{ 'animate-ring': isRinging }" class="material-symbols-outlined group-hover:text-primary transition-colors">notifications</span>
              <span 
                v-if="unreadCount > 0"
                :class="{ 'animate-pulse-badge': isRinging }"
                class="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-surface-container-lowest scale-90"
              >
                {{ unreadCount }}
              </span>
            </button>

            <!-- Notifications Dropdown Panel -->
            <div 
              v-if="showNotificationsPanel"
              @click.stop
              class="absolute right-0 top-12 w-80 bg-surface border border-outline-variant/30 rounded-2xl shadow-2xl z-[1001] overflow-hidden text-on-surface divide-y divide-outline-variant/20"
            >
              <!-- Header -->
              <div class="p-3 bg-surface-variant/20 flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-primary text-sm">notifications</span>
                  <h4 class="font-bold text-xs text-on-surface">Thông báo mới nhất</h4>
                </div>
                <button 
                  v-if="unreadCount > 0" 
                  @click="handleMarkAllAsRead" 
                  class="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                >
                  Đánh dấu đã đọc
                </button>
              </div>

              <!-- List -->
              <div class="max-h-72 overflow-y-auto divide-y divide-outline-variant/10 custom-scrollbar">
                <div v-if="notifications.length === 0" class="p-6 text-center text-xs text-on-surface-variant/70">
                  Không có thông báo mới nào
                </div>
                <div 
                  v-for="notif in notifications" 
                  :key="notif.id"
                  @click="handleNotificationClick(notif)"
                  class="p-3 hover:bg-surface-container-low transition-colors cursor-pointer flex items-start gap-2.5 relative group/item"
                  :class="{ 'bg-primary/5': notif.trangThai === 0 }"
                >
                  <div class="mt-1.5 flex-shrink-0">
                    <span 
                      class="block w-2.5 h-2.5 rounded-full"
                      :class="notif.trangThai === 0 ? 'bg-primary' : 'bg-outline-variant/40'"
                    ></span>
                  </div>
                  <div class="flex-1 flex flex-col gap-0.5 pr-6">
                    <h5 class="text-xs font-bold text-on-surface line-clamp-1 text-left">{{ notif.tieuDe }}</h5>
                    <p class="text-[11px] text-on-surface-variant leading-relaxed line-clamp-2 text-left">{{ notif.noiDung }}</p>
                    <span class="text-[10px] text-on-surface-variant/60 mt-1 text-left">{{ formatDate(notif.ngayTao) }}</span>
                  </div>
                  <button 
                    @click.stop="handleDeleteClick(notif.id)"
                    class="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-on-surface-variant hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/item:opacity-100 transition-all duration-200 cursor-pointer flex items-center justify-center"
                    title="Xóa thông báo"
                  >
                    <span class="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>

              <!-- Footer (Clear All) -->
              <div v-if="notifications.length > 0" class="p-2 border-t border-outline-variant/30 bg-surface flex justify-center">
                <button 
                  @click="handleClearAll"
                  class="text-xs text-red-500 hover:text-red-700 font-semibold cursor-pointer w-full py-1.5 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <span class="material-symbols-outlined text-[16px]">delete_sweep</span>
                  Xóa tất cả thông báo
                </button>
              </div>
            </div>
          </div>
          <div class="h-8 w-px bg-surface-container-high mx-2"></div>
          <!-- User Profile Dropdown -->
          <div class="relative">
            <button 
              @click.stop="toggleUserDropdown"
              class="flex items-center gap-3 cursor-pointer hover:bg-surface-container-low p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-surface-container-high outline-none"
            >
              <img
                v-if="authStore.user?.anh"
                alt="Admin User Profile"
                class="w-8 h-8 rounded-full object-cover shadow-sm border border-surface-container"
                :src="getImageUrl(authStore.user.anh)"
              />
              <div
                v-else
                class="w-8 h-8 rounded-full bg-[#EF972D] text-white flex items-center justify-center font-bold text-sm shadow-sm"
              >
                {{ authStore.user?.hoTen ? authStore.user.hoTen.charAt(0).toUpperCase() : 'A' }}
              </div>
              <div class="flex flex-col items-start">
                <span class="font-label-sm text-on-surface leading-tight font-semibold">{{ authStore.user?.hoTen || 'Quản trị viên' }}</span>
              </div>
              <span class="material-symbols-outlined text-on-surface-variant text-[20px] transition-transform duration-200" :class="{ 'rotate-180': showUserDropdown }">keyboard_arrow_down</span>
            </button>

            <!-- Dropdown Menu -->
            <div 
              v-if="showUserDropdown"
              @click.stop
              class="absolute right-0 top-12 w-64 bg-surface border border-outline-variant/30 rounded-2xl shadow-2xl z-[1001] overflow-hidden text-on-surface py-2 divide-y divide-outline-variant/20"
            >
              <div class="px-4 py-3 bg-surface-variant/20">
                <p class="font-bold text-sm text-on-surface line-clamp-1">{{ authStore.user?.hoTen || 'Quản trị viên' }}</p>
                <p class="text-xs text-[#EF972D] font-semibold mt-0.5">{{ authStore.user?.tenVaiTro || (authStore.isManager ? 'Quản lý' : 'Nhân viên') }}</p>
              </div>

              <div class="py-1">
                <button 
                  @click.stop="openStaffProfileModal('profile')"
                  class="w-full text-left px-4 py-2.5 hover:bg-surface-container-low transition-colors flex items-center gap-3 text-xs font-bold text-on-surface cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[#EF972D] text-lg">person</span>
                  <span>Thông tin cá nhân (Hồ sơ)</span>
                </button>

                <button 
                  @click.stop="openStaffProfileModal('password')"
                  class="w-full text-left px-4 py-2.5 hover:bg-surface-container-low transition-colors flex items-center gap-3 text-xs font-bold text-on-surface cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[#EF972D] text-lg">lock_reset</span>
                  <span>Đổi mật khẩu</span>
                </button>

                <button 
                  @click.stop="openStaffProfileModal('settings')"
                  class="w-full text-left px-4 py-2.5 hover:bg-surface-container-low transition-colors flex items-center gap-3 text-xs font-bold text-on-surface cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[#EF972D] text-lg">settings</span>
                  <span>Cài đặt</span>
                </button>
              </div>

              <div class="pt-1">
                <button 
                  @click.stop="handleLogout"
                  class="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 transition-colors flex items-center gap-3 text-xs font-bold cursor-pointer"
                >
                  <span class="material-symbols-outlined text-lg">logout</span>
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content Canvas -->
      <main class="flex-1 mt-16 p-container-padding bg-[#F8F9FA] w-full">
        <slot />
      </main>
    </div>

    <!-- Blocking Open Shift Modal -->
    <div v-if="showOpenShiftModal && shiftStatus" class="fixed inset-0 bg-[#0D2533]/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-150 overflow-hidden transform transition-all">
        <!-- Header -->
        <div class="bg-gradient-to-r from-[#F6B25C] to-[#EF972D] text-white text-center py-6 px-4">
          <h3 class="text-xl font-bold uppercase tracking-wider">Mở Ca Làm Việc</h3>
          <p class="text-xs text-white/80 mt-1 font-medium">Hệ thống quản lý bán hàng ChocoStyle Shop</p>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-5">
          <!-- User info & Live Clock -->
          <div class="bg-gray-100/80 rounded-full px-4 py-2 text-xs font-semibold text-gray-600 text-center">
            Nhân viên : <span class="font-bold text-gray-800">{{ shiftStatus.employeeName }}</span> • {{ currentOpenTime }}
          </div>

          <!-- Assigned Shift -->
          <div>
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Ca làm việc được phân công</label>
            <div class="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700">
              {{ shiftStatus.shiftName }}
            </div>
          </div>

          <!-- Handover Card -->
          <div class="bg-sky-50 border border-sky-100 rounded-2xl p-4 space-y-2.5">
            <div class="flex items-center gap-1.5 text-xs font-bold text-sky-800 uppercase tracking-wider">
              <span class="material-symbols-outlined text-[18px]">swap_horiz</span>
              Bàn giao từ ca trước:
            </div>
            <div class="flex justify-between items-center text-xs text-sky-700 font-medium">
              <span>Tiền mặt tại két:</span>
              <span class="font-bold text-sm text-sky-900">{{ formatCurrency(shiftStatus.previousShiftCash) }}</span>
            </div>
            <div class="flex justify-between items-center text-xs text-sky-700 font-medium">
              <span>Số dư chuyển khoản:</span>
              <span class="font-bold text-sm text-sky-900">{{ formatCurrency(shiftStatus.previousShiftBank) }}</span>
            </div>
          </div>

          <!-- Starting Cash Input -->
          <div>
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Xác nhận Tiền mặt đầu ca</label>
            <div class="relative flex items-center">
              <input 
                type="number" 
                v-model.number="startingCashInput"
                class="w-full px-4 py-3 bg-white border-2 border-gray-200 focus:border-[#EF972D] rounded-xl outline-none text-sm font-bold text-gray-800 transition-all pr-12"
                placeholder="0"
              />
              <span class="absolute right-4 text-xs font-bold text-gray-400">VND</span>
            </div>
          </div>

          <!-- Starting Bank Balance Input (disabled) -->
          <div>
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Xác nhận Tiền tài khoản đầu ca</label>
            <p class="text-[10px] text-gray-400 mb-1.5 italic">Tiền tài khoản đầu ca (Tự động chuyển từ ca trước)</p>
            <div class="relative flex items-center">
              <input 
                type="text" 
                disabled
                :value="startingCashInput > 0 ? 0 : 0" 
                class="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-400 cursor-not-allowed pr-12"
              />
              <span class="absolute right-4 text-xs font-bold text-gray-400">VND</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 pb-6 pt-2 flex gap-4">
          <button 
            @click="handleLogout"
            class="flex-1 py-3 border-2 border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl font-bold text-sm transition-all text-center cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button 
            @click="handleOpenShift"
            :disabled="isOpeningShift"
            class="flex-1 py-3 bg-[#EF972D] hover:bg-[#D87D15] disabled:bg-[#EF972D]/50 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span v-if="isOpeningShift" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Xác nhận mở ca
          </button>
        </div>
      </div>
    </div>

    <!-- Staff Profile & Settings Modal -->
    <div v-if="showStaffProfileModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div class="bg-surface border border-outline-variant/30 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="flex justify-between items-center border-b border-outline-variant/20 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-[#EF972D] text-white flex items-center justify-center font-bold text-lg uppercase shadow-sm">
              {{ staffForm.hoVaTen ? staffForm.hoVaTen.charAt(0) : 'A' }}
            </div>
            <div>
              <h3 class="text-base font-extrabold text-on-surface uppercase tracking-tight">Hồ sơ & Cài đặt cá nhân</h3>
              <p class="text-xs text-outline font-medium">Chức vụ: <span class="text-[#EF972D] font-bold">{{ staffForm.tenVaiTro }}</span></p>
            </div>
          </div>
          <button @click="showStaffProfileModal = false" class="text-outline hover:text-on-surface transition-colors cursor-pointer">
            <span class="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <!-- Modal Navigation Tabs -->
        <div class="flex gap-2 border-b border-outline-variant/20 pb-2">
          <button 
            @click="staffActiveTab = 'profile'"
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            :class="staffActiveTab === 'profile' ? 'bg-[#EF972D] text-white shadow-sm' : 'text-on-surface hover:bg-surface-variant/40'"
          >
            <span class="material-symbols-outlined text-sm">person</span>
            👤 Thông tin cá nhân
          </button>

          <button 
            @click="staffActiveTab = 'password'"
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            :class="staffActiveTab === 'password' ? 'bg-[#EF972D] text-white shadow-sm' : 'text-on-surface hover:bg-surface-variant/40'"
          >
            <span class="material-symbols-outlined text-sm">lock_reset</span>
            🔑 Đổi mật khẩu
          </button>

          <button 
            @click="staffActiveTab = 'settings'"
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            :class="staffActiveTab === 'settings' ? 'bg-[#EF972D] text-white shadow-sm' : 'text-on-surface hover:bg-surface-variant/40'"
          >
            <span class="material-symbols-outlined text-sm">settings</span>
            ⚙️ Cài đặt
          </button>
        </div>

        <!-- Loading state -->
        <div v-if="isStaffProfileLoading" class="py-8 text-center text-outline">
          <span class="material-symbols-outlined animate-spin text-2xl mb-1">progress_activity</span>
          <p class="text-xs font-medium">Đang lấy thông tin nhân viên...</p>
        </div>

        <!-- Tab 1: Thông tin cá nhân -->
        <div v-else-if="staffActiveTab === 'profile'" class="space-y-4">
          <form @submit.prevent="saveStaffProfile" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold uppercase text-on-surface mb-1">Họ và tên <span class="text-red-500">*</span></label>
                <input 
                  type="text" 
                  v-model="staffForm.hoVaTen" 
                  placeholder="Nhập họ và tên"
                  required
                  class="w-full px-3 py-2 bg-surface border border-outline-variant/50 focus:border-[#EF972D] rounded-xl text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase text-on-surface mb-1">Chức vụ / Phòng ban</label>
                <input 
                  type="text" 
                  :value="staffForm.tenVaiTro" 
                  disabled 
                  class="w-full px-3 py-2 bg-surface-variant/30 border border-outline-variant/30 rounded-xl text-sm font-semibold text-outline cursor-not-allowed"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold uppercase text-on-surface mb-1">Số điện thoại <span class="text-red-500">*</span></label>
                <input 
                  type="text" 
                  v-model="staffForm.soDienThoai" 
                  placeholder="VD: 0901234567"
                  required
                  class="w-full px-3 py-2 bg-surface border border-outline-variant/50 focus:border-[#EF972D] rounded-xl text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase text-on-surface mb-1">Email <span class="text-red-500">*</span></label>
                <input 
                  type="email" 
                  v-model="staffForm.email" 
                  placeholder="VD: email@company.com"
                  required
                  class="w-full px-3 py-2 bg-surface border border-outline-variant/50 focus:border-[#EF972D] rounded-xl text-sm"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-bold uppercase text-on-surface mb-1">CCCD / CMND</label>
                <input 
                  type="text" 
                  v-model="staffForm.cccd" 
                  placeholder="Nhập số CCCD"
                  class="w-full px-3 py-2 bg-surface border border-outline-variant/50 focus:border-[#EF972D] rounded-xl text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase text-on-surface mb-1">Giới tính</label>
                <div class="flex items-center gap-4 py-2">
                  <label class="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold">
                    <input type="radio" v-model="staffForm.gioiTinh" :value="1" class="accent-[#EF972D]"/>
                    <span>Nam</span>
                  </label>
                  <label class="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold">
                    <input type="radio" v-model="staffForm.gioiTinh" :value="0" class="accent-[#EF972D]"/>
                    <span>Nữ</span>
                  </label>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold uppercase text-on-surface mb-1">Ngày sinh</label>
                <input 
                  type="date" 
                  v-model="staffForm.ngaySinh" 
                  class="w-full px-3 py-2 bg-surface border border-outline-variant/50 focus:border-[#EF972D] rounded-xl text-sm"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-on-surface mb-1">Địa chỉ thường trú</label>
              <input 
                type="text" 
                v-model="staffForm.diaChi" 
                placeholder="Nhập địa chỉ của nhân viên"
                class="w-full px-3 py-2 bg-surface border border-outline-variant/50 focus:border-[#EF972D] rounded-xl text-sm"
              />
            </div>

            <div class="pt-3 flex justify-end gap-3 border-t border-outline-variant/20">
              <button 
                type="button" 
                @click="showStaffProfileModal = false" 
                class="px-4 py-2 border border-outline-variant/50 text-on-surface-variant font-bold text-xs uppercase rounded-xl hover:bg-surface-variant/40 transition-colors"
              >
                HỦY BỎ
              </button>
              <button 
                type="submit" 
                :disabled="isStaffProfileSubmitting"
                class="px-5 py-2 bg-[#EF972D] hover:bg-[#D87D15] text-white font-bold text-xs uppercase rounded-xl transition-all shadow-md inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <span v-if="isStaffProfileSubmitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span v-else class="material-symbols-outlined text-sm">save</span>
                LƯU THAY ĐỔI
              </button>
            </div>
          </form>
        </div>

        <!-- Tab 2: Đổi mật khẩu -->
        <div v-else-if="staffActiveTab === 'password'" class="space-y-4">
          <form @submit.prevent="saveStaffPassword" class="space-y-4 max-w-md">
            <div>
              <label class="block text-xs font-bold uppercase text-on-surface mb-1">Mật khẩu mới <span class="text-red-500">*</span></label>
              <input 
                type="password" 
                v-model="staffPasswordForm.newPassword" 
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                required
                class="w-full px-3 py-2 bg-surface border border-outline-variant/50 focus:border-[#EF972D] rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-on-surface mb-1">Xác nhận mật khẩu mới <span class="text-red-500">*</span></label>
              <input 
                type="password" 
                v-model="staffPasswordForm.confirmPassword" 
                placeholder="Nhập lại mật khẩu mới"
                required
                class="w-full px-3 py-2 bg-surface border border-outline-variant/50 focus:border-[#EF972D] rounded-xl text-sm"
              />
            </div>

            <div class="pt-3 flex justify-end gap-3 border-t border-outline-variant/20">
              <button 
                type="button" 
                @click="showStaffProfileModal = false" 
                class="px-4 py-2 border border-outline-variant/50 text-on-surface-variant font-bold text-xs uppercase rounded-xl hover:bg-surface-variant/40 transition-colors"
              >
                HỦY BỎ
              </button>
              <button 
                type="submit" 
                :disabled="isStaffProfileSubmitting"
                class="px-5 py-2 bg-[#EF972D] hover:bg-[#D87D15] text-white font-bold text-xs uppercase rounded-xl transition-all shadow-md inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <span v-if="isStaffProfileSubmitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span v-else class="material-symbols-outlined text-sm">check_circle</span>
                CẬP NHẬT MẬT KHẨU
              </button>
            </div>
          </form>
        </div>

        <!-- Tab 3: Cài đặt -->
        <div v-else-if="staffActiveTab === 'settings'" class="space-y-4">
          <div class="space-y-3">
            <div class="flex items-center justify-between p-3.5 border border-outline-variant/30 rounded-2xl">
              <div>
                <h4 class="text-xs font-bold text-on-surface uppercase">Giao diện (Dark / Light mode)</h4>
                <p class="text-[11px] text-outline mt-0.5">Tùy chỉnh tông màu tối/sáng cho màn hình quản trị hệ thống.</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="settingsForm.darkMode" class="sr-only peer">
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#EF972D]"></div>
              </label>
            </div>

            <div class="flex items-center justify-between p-3.5 border border-outline-variant/30 rounded-2xl">
              <div>
                <h4 class="text-xs font-bold text-on-surface uppercase">Âm thanh chuông thông báo</h4>
                <p class="text-[11px] text-outline mt-0.5">Phát âm thanh thông báo khi có đơn hàng mới phát sinh.</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="settingsForm.soundAlert" class="sr-only peer">
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#EF972D]"></div>
              </label>
            </div>
          </div>

          <div class="pt-3 flex justify-end border-t border-outline-variant/20">
            <button 
              type="button" 
              @click="showStaffProfileModal = false; showToast('Đã lưu tùy chỉnh cài đặt giao diện!', 'success')" 
              class="px-5 py-2 bg-[#EF972D] hover:bg-[#D87D15] text-white font-bold text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer"
            >
              HOÀN TẤT
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast Notifications -->
    <div 
      v-if="toast.show" 
      class="fixed bottom-5 right-5 z-[9999] transform translate-y-0 opacity-100 transition-all duration-300 pointer-events-none"
    >
      <div 
        class="flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-white font-medium text-sm animate-slide-up"
        :class="{
          'bg-gradient-to-r from-emerald-500 to-teal-600 border-emerald-400': toast.type === 'success',
          'bg-gradient-to-r from-rose-500 to-red-600 border-rose-400': toast.type === 'error',
          'bg-gradient-to-r from-[#FFB74D] to-[#EF972D] border-orange-300': toast.type === 'info'
        }"
      >
        <span class="material-symbols-outlined text-[20px] shrink-0">
          {{ toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'cancel' : 'info' }}
        </span>
        <span class="leading-snug whitespace-pre-line pr-2">{{ toast.message }}</span>
      </div>
    </div>

    <!-- Logout Confirmation Modal -->
    <div v-if="showLogoutConfirmModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div class="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 text-center space-y-4 transform transition-all animate-slide-up">
        <div class="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner">
          <span class="material-symbols-outlined text-3xl">logout</span>
        </div>
        <div class="space-y-1">
          <h3 class="text-base font-bold text-gray-900">Xác nhận đăng xuất</h3>
          <p class="text-xs text-gray-500">Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?</p>
        </div>
        <div class="flex gap-3 pt-2">
          <button 
            type="button"
            @click="showLogoutConfirmModal = false"
            class="flex-1 py-2.5 px-4 border border-gray-200 text-gray-700 font-bold text-xs uppercase rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button 
            type="button"
            @click="confirmLogout"
            class="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
.animate-slide-up {
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes ring {
  0% { transform: rotate(0); }
  10% { transform: rotate(15deg); }
  20% { transform: rotate(-10deg); }
  30% { transform: rotate(8deg); }
  40% { transform: rotate(-6deg); }
  50% { transform: rotate(4deg); }
  60% { transform: rotate(-3deg); }
  70% { transform: rotate(2deg); }
  80% { transform: rotate(-1deg); }
  90% { transform: rotate(1deg); }
  100% { transform: rotate(0); }
}
.animate-ring {
  display: inline-block;
  animation: ring 1.5s infinite;
  transform-origin: top center;
  color: #EF972D !important;
}

@keyframes pulse-badge {
  0%, 100% { transform: scale(0.9); }
  50% { transform: scale(1.2); }
}
.animate-pulse-badge {
  animation: pulse-badge 1.5s infinite;
}
</style>

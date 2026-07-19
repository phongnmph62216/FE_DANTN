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

const handleLogout = () => {
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
  document.addEventListener('click', closeNotificationsPanel)
  checkShiftStatus()
  notificationStore.connectWs()
  if (authStore.isLoggedIn && authStore.isAdminOrStaff) {
    startReminderTimer()
  }
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  document.removeEventListener('click', closeNotificationsPanel)
  stopClock()
  stopReminderTimer()
})

watch(() => route.path, () => {
  checkShiftStatus()
})

// State to expand/collapse sidebar
const sidebarExpanded = ref(true)

// Menu expand/collapse states for collapsible sections
const menuStates = ref({
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

        <!-- Quản lý đơn hàng -->
        <li>
          <RouterLink
            to="/orders"
            :class="sidebarExpanded ? 'px-4' : 'px-0 justify-center'"
            class="flex items-center gap-3 py-3 rounded-lg font-bold transition-all shadow-sm"
            :style="isActiveRoute('/orders') || route.path.startsWith('/orders') ? 'background-image: linear-gradient(to right, #FFB74D, #EF972D); color: #ffffff;' : 'color: rgba(211, 228, 254, 0.8);'"
            :class-active="isActiveRoute('/orders') || route.path.startsWith('/orders') ? '' : 'hover:bg-surface-variant/10 hover:text-surface-bright'"
          >
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">shopping_bag</span>
            <span class="font-body-md text-body-md font-semibold whitespace-nowrap" v-show="sidebarExpanded">Quản lý đơn hàng</span>
          </RouterLink>
        </li>

        <!-- Quản lý hóa đơn -->
        <li>
          <RouterLink
            to="/invoices"
            :class="sidebarExpanded ? 'px-4' : 'px-0 justify-center'"
            class="flex items-center gap-3 py-3 rounded-lg font-bold transition-all shadow-sm"
            :style="isActiveRoute('/invoices') || route.path.startsWith('/invoices') ? 'background-image: linear-gradient(to right, #FFB74D, #EF972D); color: #ffffff;' : 'color: rgba(211, 228, 254, 0.8);'"
            :class-active="isActiveRoute('/invoices') || route.path.startsWith('/invoices') ? '' : 'hover:bg-surface-variant/10 hover:text-surface-bright'"
          >
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">receipt_long</span>
            <span class="font-body-md text-body-md font-semibold whitespace-nowrap" v-show="sidebarExpanded">Quản lý hóa đơn</span>
          </RouterLink>
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
      <!-- TopNavBar -->
      <header
        :class="sidebarExpanded ? 'w-[calc(100%-260px)]' : 'w-[calc(100%-80px)]'"
        class="fixed top-0 right-0 h-16 bg-surface-container-lowest flex items-center justify-end px-container-padding z-10 border-b border-surface-container shadow-sm transition-all duration-300 ease-in-out"
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
              class="absolute right-0 top-12 w-80 bg-surface border border-outline-variant/30 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-96"
            >
              <div class="p-4 bg-surface border-b border-outline-variant/30 flex justify-between items-center">
                <span class="font-bold text-sm text-on-surface flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[18px]">notifications</span>
                  Thông báo ({{ unreadCount }})
                </span>
                <button 
                  v-if="unreadCount > 0"
                  @click="markAllAsRead"
                  class="text-xs text-primary hover:underline font-semibold cursor-pointer"
                >
                  Đánh dấu đã đọc
                </button>
              </div>

              <!-- List -->
              <div class="overflow-y-auto flex-1 divide-y divide-outline-variant/20 scrollbar-thin max-h-80">
                <div v-if="notifications.length === 0" class="p-6 text-center text-xs text-on-surface-variant">
                  Không có thông báo nào.
                </div>
                <div 
                  v-for="notif in notifications" 
                  :key="notif.id"
                  @click="handleNotificationClick(notif)"
                  class="p-3.5 hover:bg-surface-container-low transition-colors cursor-pointer flex gap-3 items-start group/item relative"
                  :class="{ 'bg-surface-container-lowest': notif.trangThai === 0 }"
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
          <div class="flex items-center gap-3 cursor-pointer hover:bg-surface-container-low p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-surface-container-high">
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
              <span class="font-label-sm text-on-surface leading-tight">{{ authStore.user?.hoTen || 'Quản trị viên' }}</span>
            </div>
            <span class="material-symbols-outlined text-on-surface-variant text-[20px]">keyboard_arrow_down</span>
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

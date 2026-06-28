<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const handleLogout = () => {
  authStore.logout()
  router.push('/auth')
}

// Notifications state and functions
import { onMounted, onUnmounted } from 'vue'
import api from '@/services/api'

const notifications = ref([])
const unreadCount = ref(0)
const showNotificationsPanel = ref(false)

const fetchNotifications = async () => {
  try {
    const resCount = await api.get('/api/v1/thong-bao/chua-doc/count')
    unreadCount.value = resCount.data?.data || 0

    const resList = await api.get('/api/v1/thong-bao')
    notifications.value = resList.data?.data || []
  } catch (error) {
    console.error('Error fetching notifications:', error)
  }
}

const toggleNotificationsPanel = (event) => {
  event.stopPropagation()
  showNotificationsPanel.value = !showNotificationsPanel.value
}

const closeNotificationsPanel = () => {
  showNotificationsPanel.value = false
}

const handleNotificationClick = async (notif) => {
  try {
    await api.put(`/api/v1/thong-bao/${notif.id}/da-doc`)
    await fetchNotifications()
    router.push(`/invoices/${notif.idHoaDon}`)
    closeNotificationsPanel()
  } catch (error) {
    console.error('Error marking notification as read:', error)
  }
}

const markAllAsRead = async () => {
  try {
    await api.put('/api/v1/thong-bao/da-doc-tat-ca')
    await fetchNotifications()
  } catch (error) {
    console.error('Error marking all as read:', error)
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit'
  })
}

let pollInterval = null
onMounted(() => {
  fetchNotifications()
  pollInterval = setInterval(fetchNotifications, 10000)
  document.addEventListener('click', closeNotificationsPanel)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  document.removeEventListener('click', closeNotificationsPanel)
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
        <li>
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
        <li>
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
        <li>
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
        <li>
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

        <!-- Quản lý tài khoản (Collapsible) -->
        <li>
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
            <a class="py-2 text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5 rounded-md px-3 font-body-md text-sm transition-colors block" href="#">Lịch làm việc</a>
            <a class="py-2 text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5 rounded-md px-3 font-body-md text-sm transition-colors block" href="#">Ca làm việc</a>
            <a class="py-2 text-surface-variant/60 hover:text-surface-bright hover:bg-surface-variant/5 rounded-md px-3 font-body-md text-sm transition-colors block" href="#">Lịch sử hoạt động</a>
          </div>
        </li>

        <!-- Quản lý Chat -->
        <li>
          <a
            :class="sidebarExpanded ? 'px-4' : 'px-0 justify-center'"
            class="flex items-center justify-between py-3 text-surface-variant/80 hover:bg-surface-variant/10 hover:text-surface-bright rounded-lg transition-colors group cursor-pointer"
            href="#"
          >
            <div :class="!sidebarExpanded && 'justify-center w-full'" class="flex items-center gap-3">
              <span class="material-symbols-outlined group-hover:scale-110 transition-transform">chat</span>
              <span class="font-body-md text-body-md whitespace-nowrap" v-show="sidebarExpanded">Quản lý Chat</span>
            </div>
          </a>
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
              <span class="material-symbols-outlined group-hover:text-primary transition-colors">notifications</span>
              <span 
                v-if="unreadCount > 0"
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
                  class="p-3.5 hover:bg-surface-container-low transition-colors cursor-pointer flex gap-3 items-start"
                  :class="{ 'bg-surface-container-lowest': notif.trangThai === 0 }"
                >
                  <div class="mt-1.5 flex-shrink-0">
                    <span 
                      class="block w-2.5 h-2.5 rounded-full"
                      :class="notif.trangThai === 0 ? 'bg-primary' : 'bg-outline-variant/40'"
                    ></span>
                  </div>
                  <div class="flex-1 flex flex-col gap-0.5">
                    <h5 class="text-xs font-bold text-on-surface line-clamp-1 text-left">{{ notif.tieuDe }}</h5>
                    <p class="text-[11px] text-on-surface-variant leading-relaxed line-clamp-2 text-left">{{ notif.noiDung }}</p>
                    <span class="text-[10px] text-on-surface-variant/60 mt-1 text-left">{{ formatDate(notif.ngayTao) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="h-8 w-px bg-surface-container-high mx-2"></div>
          <!-- User Profile Dropdown -->
          <div class="flex items-center gap-3 cursor-pointer hover:bg-surface-container-low p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-surface-container-high">
            <img
              alt="Admin User Profile"
              class="w-8 h-8 rounded-full object-cover shadow-sm border border-surface-container"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDB9BDjKZNGg7RYSTuluq9Bm2i8A09TR7KVgMbJ8E7SNh6ICgs9ruWENb93tFQ3kPuF0Ktc8pNCkhtzE6XkUtprrh2eb7Ew-2MN6bjHGKh2VCn93eKLDX1ctOjv4BLKQncfirKP374z70_kaaU7xaQ62XzMrkZQ0V52AWquSIMaxCwn5XiQhQqqZxdWpAARchrxYUZdVtNW1FC8Sh9alRiaTX75eDJ7vHJ_u2Yhs8LwOPauLSj9thFrq23Tn-Sgz73P92iYxOcOl64"
            />
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
  </div>
</template>

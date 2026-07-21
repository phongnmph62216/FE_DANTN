<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import ChatbotWidget from '@/components/ChatbotWidget.vue'

import api from '@/services/api'
import { formatCurrency } from '@/utils/format'

const router = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()
const showAccountMenu = ref(false)
const showMobileMenu = ref(false)
const showLogoutConfirmModal = ref(false)

// Live Search States (TokyoLife Style)
const searchQuery = ref('')
const searchSuggestions = ref([])
const searchTotalElements = ref(0)
const isSearching = ref(false)
const showSearchDropdown = ref(false)
const showMobileSearchModal = ref(false)

// Mini Cart Hover Popup States
const showMiniCart = ref(false)
const miniCartItems = computed(() => cartStore.items)

const freeShippingTarget = 399000
const miniCartShippingRemains = computed(() => Math.max(0, freeShippingTarget - cartStore.totalPrice))

let miniCartLeaveTimer = null

const handleCartMouseEnter = () => {
  if (miniCartLeaveTimer) clearTimeout(miniCartLeaveTimer)
  showMiniCart.value = true
}

const handleCartMouseLeave = () => {
  miniCartLeaveTimer = setTimeout(() => {
    showMiniCart.value = false
  }, 350)
}

const toggleMiniCartClick = (event) => {
  if (event) event.stopPropagation()
  if (miniCartLeaveTimer) clearTimeout(miniCartLeaveTimer)
  showMiniCart.value = !showMiniCart.value
  showAccountMenu.value = false
  showSearchDropdown.value = false
}

const updateMiniCartQuantity = (item, val) => {
  let num = parseInt(val, 10)
  if (isNaN(num) || num < 1) num = 1
  if (item.stock && num > item.stock) num = item.stock
  cartStore.updateQuantity(item.variantId, num)
}

const incrementMiniCart = (item) => {
  if (item.quantity < (item.stock || 99)) {
    cartStore.incrementQuantity(item.variantId)
  }
}

const decrementMiniCart = (item) => {
  if (item.quantity > 1) {
    cartStore.decrementQuantity(item.variantId)
  }
}

const removeMiniCartItem = (variantId) => {
  cartStore.removeItem(variantId)
}

const hotKeywords = [
  'Áo Polo Hè',
  'Áo T-Shirt Cotton',
  'Áo Sơ Mi Đũi',
  'Áo Thun Nam',
  'Ưu Đãi Hè'
]

const sanitizeVietnamese = (text) => {
  if (!text) return ''
  let cleaned = text
  cleaned = cleaned.replace(/Vi\?t Nam/g, 'Việt Nam')
  cleaned = cleaned.replace(/C\? b\?/g, 'Cổ bẻ')
  cleaned = cleaned.replace(/C\? tròn/g, 'Cổ tròn')
  cleaned = cleaned.replace(/Tr\?ng/g, 'Trắng')
  return cleaned
}

const formatImage = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&q=80'
  if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) return url
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${apiBase.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

let searchTimer = null

const handleSearchInput = (event) => {
  if (event) event.stopPropagation()
  showSearchDropdown.value = true
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchSearchSuggestions()
  }, 150)
}

const fetchSearchSuggestions = async () => {
  isSearching.value = true
  try {
    const params = {
      trangThai: 1,
      page: 0,
      size: 6
    }
    if (searchQuery.value.trim()) {
      params.keyword = searchQuery.value.trim()
    }
    const res = await api.get('/api/v1/san-pham', { params })
    const data = res.data?.content || res.data?.data || res.data || []
    searchTotalElements.value = res.data?.totalElements || data.length || 0
    if (Array.isArray(data)) {
      searchSuggestions.value = data.map(item => ({
        id: item.id,
        code: item.maSanPham || '',
        name: sanitizeVietnamese(item.tenSanPham || ''),
        brand: sanitizeVietnamese(item.tenThuongHieu || ''),
        image: formatImage(item.hinhAnh),
        price: item.giaThapNhatSauGiam || item.giaThapNhat || 199000,
        originalPrice: item.giaThapNhat || 199000,
        maxDiscountPercent: item.maxPhanTramGiam || 0
      }))
    }
  } catch (err) {
    console.error('Search suggestions failed:', err)
  } finally {
    isSearching.value = false
  }
}

const onSearchFocus = (event) => {
  if (event) event.stopPropagation()
  showSearchDropdown.value = true
  fetchSearchSuggestions()
}

const applyKeyword = (kw) => {
  searchQuery.value = kw
  fetchSearchSuggestions()
}

const executeFullSearch = () => {
  if (!searchQuery.value.trim()) {
    router.push('/all-products')
  } else {
    router.push({ path: '/all-products', query: { search: searchQuery.value.trim() } })
  }
  showSearchDropdown.value = false
  showMobileSearchModal.value = false
}

const goToProductDetail = (id) => {
  showSearchDropdown.value = false
  showMobileSearchModal.value = false
  router.push(`/product/${id}`)
}

const toggleAccountMenu = (event) => {
  event.stopPropagation()
  showAccountMenu.value = !showAccountMenu.value
  showMobileMenu.value = false
  showSearchDropdown.value = false
}

const toggleMobileMenu = (event) => {
  event.stopPropagation()
  showMobileMenu.value = !showMobileMenu.value
  showAccountMenu.value = false
  showSearchDropdown.value = false
}

const closeAllMenus = () => {
  showAccountMenu.value = false
  showMobileMenu.value = false
  showSearchDropdown.value = false
}

const triggerLogoutConfirm = () => {
  showAccountMenu.value = false
  showMobileMenu.value = false
  showSearchDropdown.value = false
  showLogoutConfirmModal.value = true
}

const handleLogout = () => {
  showLogoutConfirmModal.value = false
  authStore.logout()
  closeAllMenus()
  router.push('/')
}

const handleStorageChange = (e) => {
  if (e.key === 'auth_user' || (e.key && e.key.startsWith('bee_cart'))) {
    cartStore.loadCart()
  }
}

onMounted(() => {
  cartStore.loadCart()
  document.addEventListener('click', closeAllMenus)
  window.addEventListener('storage', handleStorageChange)
})

onUnmounted(() => {
  document.removeEventListener('click', closeAllMenus)
  window.removeEventListener('storage', handleStorageChange)
})
</script>

<template>
  <div class="bg-background text-on-background font-body-md antialiased overflow-x-hidden pt-[140px] md:pt-[180px] min-h-screen flex flex-col justify-between">
    <div>
      <!-- 1. Header & Navigation -->
      <!-- Top Promo Banner -->
      <div class="fixed top-0 left-0 w-full z-[60] bg-primary-container text-on-primary font-label-sm text-center py-2 px-margin-mobile md:px-margin-desktop">
        MUA 2 ÁO POLO CHỈ 139K/ÁO
      </div>
      <!-- Main Header -->
      <header class="fixed top-[36px] w-full z-50 bg-surface/95 backdrop-blur-md border-b border-outline-variant/30 flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto left-1/2 -translate-x-1/2">
        <!-- Logo -->
        <RouterLink class="shrink-0 flex items-center" to="/">
          <img
            alt="Bee Stylish Logo"
            class="h-14 md:h-20 object-contain"
            src="/logoteam.png"
          />
        </RouterLink>
        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center gap-6 lg:gap-8 mx-auto">
          <RouterLink to="/" class="text-label-sm font-label-sm uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors duration-300 border-b-2 border-transparent pb-1" exact-active-class="text-primary !border-primary">TRANG CHỦ</RouterLink>
          <RouterLink to="/all-products" class="text-label-sm font-label-sm uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors duration-300 border-b-2 border-transparent pb-1" exact-active-class="text-primary !border-primary">SẢN PHẨM</RouterLink>
          <RouterLink to="/uu-dai" class="text-label-sm font-label-sm uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors duration-300 border-b-2 border-transparent pb-1" exact-active-class="text-primary !border-primary">ƯU ĐÃI</RouterLink>
          <RouterLink to="/moi-ve" class="text-label-sm font-label-sm uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors duration-300 border-b-2 border-transparent pb-1" exact-active-class="text-primary !border-primary">MỚI VỀ</RouterLink>
          <RouterLink to="/tra-cuu" class="text-label-sm font-label-sm uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors duration-300 border-b-2 border-transparent pb-1" exact-active-class="text-primary !border-primary">TRA CỨU</RouterLink>
          <RouterLink to="/ve-chung-toi" class="text-label-sm font-label-sm uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors duration-300 border-b-2 border-transparent pb-1" exact-active-class="text-primary !border-primary">VỀ CHÚNG TÔI</RouterLink>
        </nav>
        <!-- Search & Actions -->
        <div class="flex items-center gap-4 shrink-0">
          <!-- Desktop Live Search Bar (TokyoLife Inspired) -->
          <div class="hidden lg:block relative z-50" @click.stop>
            <div class="flex items-center bg-gray-100/90 rounded-full overflow-hidden border border-gray-300/80 focus-within:border-[#EF972D] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#EF972D]/20 transition-all shadow-sm w-64 xl:w-80">
              <input 
                v-model="searchQuery"
                @input="handleSearchInput"
                @focus="onSearchFocus"
                @keydown.enter="executeFullSearch"
                class="bg-transparent border-none outline-none px-4 py-2 text-xs font-medium w-full placeholder:text-gray-400 text-gray-900" 
                placeholder="Tìm kiếm áo polo, sơ mi, t-shirt..." 
                type="text"
              />
              <button 
                @click="executeFullSearch"
                class="bg-[#EF972D] text-white px-3.5 py-2 flex items-center justify-center hover:bg-[#d87f1d] transition-colors cursor-pointer shrink-0"
              >
                <span class="material-symbols-outlined text-[18px]">search</span>
              </button>
            </div>

            <!-- Live Search Dropdown Popup Panel (TokyoLife Inspired, Orange/Navy Style) -->
            <div 
              v-if="showSearchDropdown" 
              @click.stop
              class="absolute right-0 top-full mt-2.5 w-[620px] bg-white rounded-3xl shadow-2xl border border-gray-150 p-5 z-50 transform transition-all duration-300"
            >
              <!-- Suggested Hot Keywords -->
              <div class="mb-4 pb-3 border-b border-gray-100">
                <div class="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#EF972D] mb-2.5">
                  <span class="material-symbols-outlined text-sm text-red-500 animate-pulse">local_fire_department</span>
                  TÌM KIẾM GỢI Ý
                </div>
                <div class="flex flex-wrap gap-2">
                  <button 
                    v-for="kw in hotKeywords" 
                    :key="kw"
                    @click="applyKeyword(kw)"
                    class="px-3 py-1 bg-gray-100 hover:bg-[#EF972D] hover:text-white border border-gray-200 rounded-full text-xs font-semibold text-gray-700 transition-all cursor-pointer"
                  >
                    {{ kw }}
                  </button>
                </div>
              </div>

              <!-- Live Suggested Products Grid -->
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold uppercase tracking-wider text-gray-800">
                    {{ searchQuery ? `KẾT QUẢ CHO "${searchQuery}"` : 'SẢN PHẨM NỔI BẬT GỢI Ý' }}
                  </span>
                  <span v-if="isSearching" class="material-symbols-outlined animate-spin text-sm text-[#EF972D]">progress_activity</span>
                </div>

                <div v-if="searchSuggestions.length > 0" class="grid grid-cols-3 gap-3">
                  <div 
                    v-for="p in searchSuggestions" 
                    :key="p.id"
                    @click="goToProductDetail(p.id)"
                    class="bg-gray-50 hover:bg-white rounded-2xl p-2.5 border border-gray-150 hover:border-[#EF972D] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div class="relative aspect-square rounded-xl overflow-hidden mb-2 bg-gray-100">
                      <div v-if="p.maxDiscountPercent > 0" class="absolute top-1.5 left-1.5 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm z-10">
                        -{{ p.maxDiscountPercent }}%
                      </div>
                      <img :src="p.image" :alt="p.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div class="space-y-1">
                      <h4 class="text-xs font-bold text-gray-900 group-hover:text-[#EF972D] line-clamp-1 transition-colors">
                        {{ p.name }}
                      </h4>
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="text-xs font-extrabold text-[#EF972D]">{{ formatCurrency(p.price) }}</span>
                        <span v-if="p.maxDiscountPercent > 0 && p.originalPrice > p.price" class="text-[10px] text-gray-400 line-through">
                          {{ formatCurrency(p.originalPrice) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else-if="!isSearching" class="py-6 text-center text-gray-400">
                  <span class="material-symbols-outlined text-2xl mb-1 text-gray-300">search_off</span>
                  <p class="text-xs font-medium">Không tìm thấy sản phẩm phù hợp với từ khóa.</p>
                </div>
              </div>

              <!-- Footer View All Link -->
              <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span class="text-gray-500 font-medium">
                  {{ searchTotalElements > 0 ? `Tìm thấy ${searchTotalElements} sản phẩm` : '' }}
                </span>
                <button 
                  @click="executeFullSearch"
                  class="font-extrabold text-[#EF972D] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Xem tất cả {{ searchTotalElements > 0 ? `(${searchTotalElements})` : '' }}
                  <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Mobile Search Trigger Button -->
          <button 
            @click="showMobileSearchModal = true" 
            class="text-on-surface hover:text-[#EF972D] transition-colors duration-300 lg:hidden flex items-center justify-center cursor-pointer"
            title="Tìm kiếm"
          >
            <span class="material-symbols-outlined">search</span>
          </button>
          <!-- User Account Menu -->
          <div class="relative hidden md:block">
            <button 
              @click.stop="toggleAccountMenu"
              class="text-on-surface hover:text-primary transition-colors duration-300 flex items-center justify-center cursor-pointer" 
              title="Tài khoản"
            >
              <span class="material-symbols-outlined">person</span>
            </button>
            
            <!-- Dropdown Menu -->
            <div 
              v-if="showAccountMenu"
              @click.stop
              class="absolute right-0 mt-2 w-72 bg-surface border border-outline-variant/30 rounded-lg shadow-xl py-6 px-5 z-50 text-center transition-all duration-300"
            >
              <template v-if="!authStore.isLoggedIn">
                <h4 class="text-label-sm font-bold text-on-surface uppercase tracking-wider mb-1">CHÀO MỪNG QUÝ KHÁCH ĐẾN VỚI BEE STYLISH</h4>
                <p class="text-[12px] text-on-surface-variant mb-4">Đăng nhập tài khoản của Quý Khách</p>
                <RouterLink 
                  to="/auth" 
                  @click="closeAllMenus"
                  class="block w-full bg-primary hover:bg-primary/95 text-on-primary text-label-sm font-bold uppercase py-2.5 rounded transition-colors mb-5 cursor-pointer"
                >
                  ĐĂNG NHẬP
                </RouterLink>
                <div class="border-t border-outline-variant/30 my-4"></div>
                <h4 class="text-label-sm font-bold text-on-surface uppercase tracking-wider mb-1">ĐĂNG KÝ THÀNH VIÊN</h4>
                <p class="text-[12px] text-on-surface-variant mb-4">Nhận ngay ưu đãi khi mua hàng online</p>
                <RouterLink 
                  to="/auth" 
                  @click="closeAllMenus"
                  class="block w-full border border-primary text-primary hover:bg-primary/5 text-label-sm font-bold uppercase py-2.5 rounded transition-all cursor-pointer"
                >
                  ĐĂNG KÝ
                </RouterLink>
              </template>
              <template v-else>
                <h4 class="text-label-sm font-bold text-on-surface uppercase tracking-wider mb-1">XIN CHÀO</h4>
                <p class="text-body-md font-medium text-primary mb-2">{{ authStore.user?.hoTen }}</p>
                <p class="text-[12px] text-on-surface-variant mb-4">Vai trò: {{ authStore.isCustomer ? 'Khách hàng' : (authStore.isManager ? 'Quản lý' : 'Nhân viên') }}</p>
                <div class="flex flex-col gap-2 mb-4 text-left border-t border-outline-variant/30 pt-3">
                  <RouterLink
                    to="/profile"
                    @click="closeAllMenus"
                    class="flex items-center gap-2 py-1 text-sm text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                  >
                    <span class="material-symbols-outlined text-[18px]">account_circle</span>
                    Hồ sơ
                  </RouterLink>
                  <RouterLink
                    to="/my-orders"
                    @click="closeAllMenus"
                    class="flex items-center gap-2 py-1 text-sm text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                  >
                    <span class="material-symbols-outlined text-[18px]">receipt_long</span>
                    Đơn hàng của tôi
                  </RouterLink>
                </div>
                <RouterLink 
                  v-if="authStore.isAdminOrStaff" 
                  to="/admin" 
                  @click="closeAllMenus"
                  class="block w-full bg-secondary text-on-secondary hover:bg-secondary/90 text-label-sm font-bold uppercase py-2.5 rounded transition-colors mb-3 cursor-pointer"
                >
                  HỆ THỐNG QUẢN TRỊ
                </RouterLink>
                <button 
                  @click="triggerLogoutConfirm" 
                  class="block w-full bg-primary hover:bg-primary/95 text-on-primary text-label-sm font-bold uppercase py-2.5 rounded transition-colors cursor-pointer"
                >
                  ĐĂNG XUẤT
                </button>
              </template>
            </div>
          </div>
          <!-- Mini Cart Hover Dropdown (TokyoLife / Brand Styled) -->
          <div 
            class="relative hidden md:block"
            @mouseenter="handleCartMouseEnter"
            @mouseleave="handleCartMouseLeave"
            @click.stop
          >
            <button 
              type="button"
              @click="toggleMiniCartClick"
              class="text-on-surface hover:text-[#EF972D] transition-colors duration-300 relative group flex items-center justify-center py-2 cursor-pointer outline-none bg-transparent border-none"
              title="Giỏ hàng"
            >
              <span class="material-symbols-outlined group-hover:scale-110 transition-transform">shopping_bag</span>
              <span v-if="cartStore.totalItems > 0" class="absolute -top-0.5 -right-1 bg-[#EF972D] text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                {{ cartStore.totalItems > 99 ? '99+' : cartStore.totalItems }}
              </span>
            </button>

            <!-- Mini Cart Popup Panel (Seamless Bridge Container) -->
            <div 
              v-if="showMiniCart"
              @click.stop
              @mouseenter="handleCartMouseEnter"
              @mouseleave="handleCartMouseLeave"
              class="absolute right-0 top-full pt-2 w-[410px] z-50 transform transition-all duration-300 font-sans"
            >
              <div class="bg-white rounded-3xl shadow-2xl border border-gray-150 p-5">
                <div v-if="cartStore.totalItems > 0" class="space-y-4">
                  <!-- Items List -->
                  <div class="max-h-[280px] overflow-y-auto space-y-3 pr-1 divide-y divide-gray-100">
                    <div 
                      v-for="item in miniCartItems" 
                      :key="item.variantId"
                      class="pt-3 first:pt-0 flex gap-3 items-start"
                    >
                      <!-- Product Image -->
                      <div class="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200 shadow-sm">
                        <img :src="formatImage(item.image || item.hinhAnh)" :alt="item.productName || item.name" class="w-full h-full object-cover" />
                      </div>

                      <!-- Item Details -->
                      <div class="flex-1 min-w-0 space-y-1 text-left">
                        <div class="flex items-start justify-between gap-2">
                          <h4 class="text-xs font-bold text-gray-900 line-clamp-1 hover:text-[#EF972D] transition-colors">
                            {{ item.productName || item.name }}
                          </h4>
                          <button 
                            @click="removeMiniCartItem(item.variantId)"
                            class="text-gray-400 hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                            title="Xóa sản phẩm"
                          >
                            <span class="material-symbols-outlined text-base">close</span>
                          </button>
                        </div>

                        <div class="flex items-baseline gap-2">
                          <span class="text-xs font-extrabold text-[#EF972D]">{{ formatCurrency(item.price) }}</span>
                          <span v-if="item.originalPrice && item.originalPrice > item.price" class="text-[10px] text-gray-400 line-through">
                            {{ formatCurrency(item.originalPrice) }}
                          </span>
                        </div>

                        <div class="text-[11px] text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span>Kích thước: <strong class="text-gray-800">Size {{ item.size }}</strong></span>
                          <span>Màu sắc: <strong class="text-gray-800">{{ item.color }}</strong></span>
                        </div>

                        <!-- Quantity & Subtotal -->
                        <div class="flex items-center justify-between pt-1">
                          <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                            <button @click="decrementMiniCart(item)" class="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-xs font-bold cursor-pointer">-</button>
                            <input 
                              :value="item.quantity"
                              @change="updateMiniCartQuantity(item, $event.target.value)"
                              class="w-8 text-center text-xs font-bold bg-transparent outline-none border-none p-0" 
                            />
                            <button @click="incrementMiniCart(item)" class="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-xs font-bold cursor-pointer">+</button>
                          </div>
                          <span class="text-xs font-bold text-gray-700">
                            Tổng: <strong class="text-gray-900 font-extrabold">{{ formatCurrency(item.price * item.quantity) }}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Free Shipping Progress Banner -->
                  <div class="bg-[#EF972D]/10 border border-[#EF972D]/20 rounded-2xl p-3 text-xs leading-relaxed text-left">
                    <span v-if="miniCartShippingRemains > 0" class="text-gray-800">
                      Mua thêm <strong class="text-[#EF972D] font-extrabold">{{ formatCurrency(miniCartShippingRemains) }}</strong> để nhận ngay <strong class="text-[#EF972D] font-extrabold">Ưu đãi miễn phí vận chuyển.</strong>
                    </span>
                    <span v-else class="text-emerald-700 font-bold flex items-center gap-1">
                      <span class="material-symbols-outlined text-sm">local_shipping</span>
                      Bạn đã đủ điều kiện Miễn phí vận chuyển toàn quốc!
                    </span>
                  </div>

                  <!-- Total Order Value -->
                  <div class="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                    <span class="font-bold text-gray-700 uppercase tracking-wider">Tổng giá trị đơn hàng:</span>
                    <span class="text-base font-black text-[#EF972D]">{{ formatCurrency(cartStore.totalPrice) }}</span>
                  </div>

                  <!-- Action Button -->
                  <RouterLink 
                    to="/cart"
                    @click="showMiniCart = false"
                    class="block w-full py-3 bg-[#EF972D] hover:bg-[#d87f1d] active:scale-95 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl text-center shadow-lg hover:shadow-xl transition-all cursor-pointer"
                  >
                    TIẾP TỤC THANH TOÁN
                  </RouterLink>
                </div>

                <!-- Empty Cart State -->
                <div v-else class="py-8 text-center space-y-3">
                  <div class="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                    <span class="material-symbols-outlined text-2xl">shopping_bag</span>
                  </div>
                  <div class="space-y-1">
                    <h4 class="text-xs font-bold text-gray-800 uppercase">GIỎ HÀNG ĐANG TRỐNG</h4>
                    <p class="text-[11px] text-gray-500">Chưa có sản phẩm nào trong giỏ hàng của bạn.</p>
                  </div>
                  <RouterLink 
                    to="/all-products"
                    @click="showMiniCart = false"
                    class="inline-block px-5 py-2.5 bg-[#EF972D] hover:bg-[#d87f1d] text-white font-bold text-xs uppercase rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    MUA SẮM NGAY
                  </RouterLink>
                </div>
              </div>
            </div>
          </div>
          <button class="text-on-surface hover:text-primary transition-colors duration-300 md:hidden">
            <span class="material-symbols-outlined">menu</span>
          </button>
        </div>
      </header>

      <!-- Mobile Navigation (Bottom Nav - Simplified) -->
      <nav class="md:hidden fixed bottom-0 left-0 w-full bg-surface border-t border-outline-variant/30 z-50 flex justify-around items-center py-3 px-margin-mobile pb-[max(env(safe-area-inset-bottom),12px)]">
        <RouterLink class="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors" to="/">
          <span class="material-symbols-outlined">home</span>
          <span class="text-[10px] uppercase font-bold">Trang chủ</span>
        </RouterLink>
        <a class="flex flex-col items-center gap-1 text-primary" href="#">
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">category</span>
          <span class="text-[10px] uppercase font-bold">Danh mục</span>
        </a>
        <a class="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors" href="#">
          <span class="material-symbols-outlined">favorite</span>
          <span class="text-[10px] uppercase font-bold">Yêu thích</span>
        </a>
        <!-- User Account Menu on Mobile -->
        <template v-if="!authStore.isLoggedIn">
          <RouterLink class="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors" to="/auth">
            <span class="material-symbols-outlined">person</span>
            <span class="text-[10px] uppercase font-bold">Cá nhân</span>
          </RouterLink>
        </template>
        <template v-else>
          <div class="relative flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer select-none" @click.stop="toggleMobileMenu">
            <span class="material-symbols-outlined">person</span>
            <span class="text-[10px] uppercase font-bold truncate max-w-[60px]">{{ authStore.user?.hoTen?.split(' ').pop() || 'Cá nhân' }}</span>
            
            <!-- Mobile Account Dropup -->
            <div 
              v-if="showMobileMenu" 
              @click.stop
              class="fixed bottom-[70px] right-4 bg-surface border border-outline-variant/30 rounded-lg shadow-xl p-4 z-50 w-56 text-center"
            >
              <p class="text-xs text-on-surface-variant mb-2">Xin chào, {{ authStore.user?.hoTen }}</p>
              <div class="flex flex-col gap-2 mb-3 text-left border-t border-b border-outline-variant/30 py-2">
                <RouterLink
                  to="/profile"
                  @click="closeAllMenus"
                  class="flex items-center gap-2 text-xs text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[16px]">account_circle</span>
                  Hồ sơ
                </RouterLink>
                <RouterLink
                  to="/my-orders"
                  @click="closeAllMenus"
                  class="flex items-center gap-2 text-xs text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[16px]">receipt_long</span>
                  Đơn hàng của tôi
                </RouterLink>
              </div>
              <RouterLink 
                v-if="authStore.isAdminOrStaff" 
                to="/admin" 
                @click="closeAllMenus"
                class="block w-full bg-secondary text-on-secondary text-xs font-bold uppercase py-2 rounded mb-2"
              >
                Quản trị
              </RouterLink>
              <button 
                @click="triggerLogoutConfirm" 
                class="block w-full bg-[#EF972D] text-white text-xs font-bold uppercase py-2 rounded cursor-pointer"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </template>
      </nav>

      <!-- Main Content Slot -->
      <slot />
    </div>

    <!-- 7. Footer -->
    <footer class="w-full bg-[#0D2533] text-gray-300 text-sm font-sans border-t border-gray-800/80 pt-14 pb-10 mt-auto relative overflow-hidden">
      <!-- Orange top accent line -->
      <div class="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#EF972D] to-transparent opacity-90"></div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 px-4 md:px-10 max-w-[1340px] mx-auto mb-12">
        <!-- Col 1: Brand & Contact -->
        <div class="lg:col-span-2 flex flex-col gap-5">
          <RouterLink class="shrink-0 flex items-center mb-1" to="/">
            <div class="p-2.5 bg-white rounded-2xl inline-block shadow-md hover:scale-[1.02] transition-transform">
              <img
                alt="Bee Stylish Logo"
                class="h-12 md:h-14 object-contain"
                src="/logoteam.png"
              />
            </div>
          </RouterLink>
          <p class="text-gray-300/90 text-sm leading-relaxed max-w-sm">
            Thương hiệu thời trang ứng dụng mang đến trải nghiệm mua sắm đẳng cấp với các sản phẩm tối giản, thanh lịch và chất lượng.
          </p>
          <div class="flex flex-col gap-3 mt-1">
            <div class="flex items-start gap-3 text-gray-300 text-sm">
              <div class="w-8 h-8 rounded-xl bg-[#EF972D]/20 text-[#EF972D] flex items-center justify-center shrink-0 shadow-sm">
                <span class="material-symbols-outlined text-[18px]">location_on</span>
              </div>
              <span class="pt-1 leading-snug">Trịnh Văn Bô, Nam Từ Niêm, TP. Hà Nội</span>
            </div>
            <div class="flex items-center gap-3 text-gray-300 text-sm">
              <div class="w-8 h-8 rounded-xl bg-[#EF972D]/20 text-[#EF972D] flex items-center justify-center shrink-0 shadow-sm">
                <span class="material-symbols-outlined text-[18px]">call</span>
              </div>
              <span class="font-bold text-white tracking-wide">1900 123 456</span>
            </div>
            <div class="flex items-center gap-3 text-gray-300 text-sm">
              <div class="w-8 h-8 rounded-xl bg-[#EF972D]/20 text-[#EF972D] flex items-center justify-center shrink-0 shadow-sm">
                <span class="material-symbols-outlined text-[18px]">mail</span>
              </div>
              <span class="text-gray-300 font-medium">hello@beestylish.com</span>
            </div>
          </div>
        </div>

        <!-- Col 2: Links -->
        <div class="flex flex-col gap-3">
          <h4 class="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-2">
            <span class="w-2 h-2 rounded-full bg-[#EF972D]"></span>
            VỀ CHÚNG TÔI
          </h4>
          <a class="text-gray-300/90 hover:text-[#EF972D] hover:translate-x-1.5 transition-all duration-200 text-sm" href="#">Câu chuyện thương hiệu</a>
          <a class="text-gray-300/90 hover:text-[#EF972D] hover:translate-x-1.5 transition-all duration-200 text-sm" href="#">Hệ thống cửa hàng</a>
          <a class="text-[#EF972D] font-bold hover:translate-x-1.5 transition-all duration-200 text-sm flex items-center gap-1.5" href="#">
            <span>Tuyển dụng</span>
            <span class="bg-[#EF972D]/20 text-[#EF972D] text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">HOT</span>
          </a>
          <a class="text-gray-300/90 hover:text-[#EF972D] hover:translate-x-1.5 transition-all duration-200 text-sm" href="#">Tin tức & Sự kiện</a>
        </div>

        <!-- Col 3: Customer Service -->
        <div class="flex flex-col gap-3">
          <h4 class="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-2">
            <span class="w-2 h-2 rounded-full bg-[#EF972D]"></span>
            HỖ TRỢ KHÁCH HÀNG
          </h4>
          <a class="text-gray-300/90 hover:text-[#EF972D] hover:translate-x-1.5 transition-all duration-200 text-sm" href="#">Chính sách vận chuyển</a>
          <a class="text-gray-300/90 hover:text-[#EF972D] hover:translate-x-1.5 transition-all duration-200 text-sm" href="#">Chính sách đổi trả</a>
          <a class="text-gray-300/90 hover:text-[#EF972D] hover:translate-x-1.5 transition-all duration-200 text-sm" href="#">Bảo mật thông tin</a>
          <a class="text-gray-300/90 hover:text-[#EF972D] hover:translate-x-1.5 transition-all duration-200 text-sm" href="#">Câu hỏi thường gặp</a>
        </div>

        <!-- Col 4: Newsletter & Social -->
        <div class="flex flex-col gap-5">
          <h4 class="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-[#EF972D]"></span>
            ĐĂNG KÝ NHẬN TIN
          </h4>
          <p class="text-gray-300/90 text-xs leading-relaxed">Nhận thông tin ưu đãi mới nhất và mã giảm giá đặc quyền từ Bee Stylish.</p>
          
          <form class="flex overflow-hidden rounded-xl border border-gray-700/80 focus-within:border-[#EF972D] transition-colors bg-gray-900/90 shadow-inner">
            <input class="bg-transparent border-none outline-none px-3.5 py-2.5 w-full text-xs text-white placeholder:text-gray-400" placeholder="Email của bạn..." type="email"/>
            <button class="bg-[#EF972D] hover:bg-[#d87f1d] text-white px-4 py-2.5 transition-colors cursor-pointer flex items-center justify-center font-bold" type="submit">
              <span class="material-symbols-outlined text-sm">send</span>
            </button>
          </form>

          <div>
            <span class="text-xs text-gray-300 font-semibold block mb-2">Kết nối với chúng tôi:</span>
            <div class="flex gap-3">
              <a class="w-9 h-9 border border-gray-700 rounded-xl flex items-center justify-center text-gray-300 hover:bg-[#EF972D] hover:text-white hover:border-[#EF972D] transition-all shadow-sm cursor-pointer" href="#">
                <span class="font-bold text-sm">f</span>
              </a>
              <a class="w-9 h-9 border border-gray-700 rounded-xl flex items-center justify-center text-gray-300 hover:bg-[#EF972D] hover:text-white hover:border-[#EF972D] transition-all shadow-sm cursor-pointer" href="#">
                <span class="font-bold text-sm">in</span>
              </a>
              <a class="w-9 h-9 border border-gray-700 rounded-xl flex items-center justify-center text-gray-300 hover:bg-[#EF972D] hover:text-white hover:border-[#EF972D] transition-all shadow-sm cursor-pointer" href="#">
                <span class="font-bold text-sm">yt</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Copyright & Payment -->
      <div class="border-t border-gray-800/80 pt-6 px-4 md:px-10 max-w-[1340px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400">
        <p>© 2024 <span class="text-[#EF972D] font-bold">Bee Stylish</span>. All Rights Reserved.</p>
        <div class="flex gap-3 items-center flex-wrap">
          <span class="text-xs text-gray-300 font-medium mr-1">Chúng tôi kết nối thanh toán qua</span>
          <!-- COD Badge -->
          <div class="inline-flex items-center h-8 bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
            <span class="px-2.5 py-1 text-xs font-black text-gray-800 tracking-wider font-sans">COD</span>
            <div class="bg-[#EF972D] text-white px-2 py-1.5 flex items-center justify-center">
              <span class="material-symbols-outlined text-sm">local_shipping</span>
            </div>
          </div>
          <!-- VNPAY QR Badge -->
          <div class="inline-flex items-center h-8 px-3 bg-white border border-gray-200 rounded-lg shadow-sm font-black text-sm tracking-tight font-sans">
            <span class="text-[#E51D25]">VN</span>
            <span class="text-[#005BAA]">PAY</span>
            <span class="text-[#E51D25] text-[10px] uppercase font-bold ml-0.5">QR</span>
          </div>
        </div>
      </div>
    </footer>
    <ChatbotWidget />

    <!-- Logout Confirmation Modal -->
    <div v-if="showLogoutConfirmModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div class="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 text-center space-y-4 transform transition-all">
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
            @click="handleLogout"
            class="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Search Drawer Modal (TokyoLife Style) -->
    <div v-if="showMobileSearchModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] p-4 flex flex-col justify-start pt-16">
      <div class="bg-white rounded-3xl w-full max-w-lg mx-auto p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-gray-100 pb-3">
          <span class="text-sm font-extrabold text-gray-900 uppercase">TÌM KIẾM SẢN PHẨM</span>
          <button @click="showMobileSearchModal = false" class="text-gray-400 hover:text-gray-700">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="flex items-center bg-gray-100 rounded-full overflow-hidden border border-gray-300 focus-within:border-[#EF972D]">
          <input 
            v-model="searchQuery"
            @input="handleSearchInput"
            @keydown.enter="executeFullSearch"
            class="bg-transparent border-none outline-none px-4 py-2.5 text-xs font-medium w-full placeholder:text-gray-400 text-gray-900" 
            placeholder="Tìm kiếm sản phẩm..." 
            type="text"
          />
          <button @click="executeFullSearch" class="bg-[#EF972D] text-white px-4 py-2.5 flex items-center justify-center font-bold">
            <span class="material-symbols-outlined text-sm">search</span>
          </button>
        </div>

        <!-- Hot keywords -->
        <div class="space-y-2">
          <div class="text-[11px] font-bold uppercase tracking-wider text-[#EF972D] flex items-center gap-1">
            <span class="material-symbols-outlined text-sm text-red-500">local_fire_department</span>
            Gợi ý hot:
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button 
              v-for="kw in hotKeywords" 
              :key="kw"
              @click="applyKeyword(kw)"
              class="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold"
            >
              {{ kw }}
            </button>
          </div>
        </div>

        <!-- Search results -->
        <div v-if="searchSuggestions.length > 0" class="grid grid-cols-2 gap-2.5 pt-2">
          <div 
            v-for="p in searchSuggestions" 
            :key="p.id"
            @click="goToProductDetail(p.id)"
            class="bg-gray-50 rounded-xl p-2 border border-gray-150 flex items-center gap-2 cursor-pointer"
          >
            <img :src="p.image" :alt="p.name" class="w-12 h-12 object-cover rounded-lg shrink-0" />
            <div class="overflow-hidden">
              <h5 class="text-xs font-bold text-gray-900 truncate">{{ p.name }}</h5>
              <span class="text-xs font-extrabold text-[#EF972D] block">{{ formatCurrency(p.price) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

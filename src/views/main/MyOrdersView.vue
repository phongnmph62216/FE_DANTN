<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const router = useRouter()
const authStore = useAuthStore()

const formatImage = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150'
  if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${apiBase.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

// State
const orders = ref([])
const selectedOrder = ref(null)
const isLoading = ref(true)
const isError = ref(false)
const errorMessage = ref('')

// Tabs
const activeTab = ref('all')
const tabs = [
  { id: 'all', label: 'Tất cả' },
  { id: '0', label: 'Chờ xác nhận' },
  { id: '1', label: 'Đang xử lý' },
  { id: '3', label: 'Đang giao' },
  { id: '2', label: 'Đã giao' },
  { id: '4', label: 'Hoàn thành' },
  { id: '5', label: 'Đã hủy' }
]

// Cancel Request state
const showCancelModal = ref(false)
const cancelReason = ref('')
const isCancelling = ref(false)
const cancelError = ref('')
const cancelSuccessMessage = ref('')

// Fetch Customer Orders
const fetchOrders = async () => {
  isLoading.value = true
  isError.value = false
  errorMessage.value = ''
  try {
    if (!authStore.isLoggedIn) {
      router.push('/auth')
      return
    }

    const response = await api.get('/api/v1/hoa-don/khach-hang')
    orders.value = response.data || []
    
    // Auto-select first order if exists and not already selected
    if (orders.value.length > 0) {
      // Find previously selected order if any, otherwise first
      if (selectedOrder.value) {
        const found = orders.value.find(o => o.id === selectedOrder.value.id)
        selectedOrder.value = found || orders.value[0]
      } else {
        selectedOrder.value = orders.value[0]
      }
    } else {
      selectedOrder.value = null
    }
  } catch (error) {
    console.error('Failed to load customer orders:', error)
    isError.value = true
    errorMessage.value = error.response?.data?.message || 'Có lỗi xảy ra khi tải danh sách đơn hàng.'
  } finally {
    isLoading.value = false
  }
}

// Filtered Orders based on tab selection
const filteredOrders = computed(() => {
  if (activeTab.value === 'all') {
    return orders.value
  }
  const targetStatus = parseInt(activeTab.value, 10)
  return orders.value.filter(o => o.trangThai === targetStatus)
})

// Currency Formatter
const formatCurrency = (val) => {
  if (val === null || val === undefined) return '0 đ'
  return new Intl.NumberFormat('vi-VN').format(val) + ' đ'
}

// Date Formatter
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Status Badges & Styling Helpers
const getStatusLabel = (status) => {
  switch (status) {
    case 0: return 'Chờ xác nhận'
    case 1: return 'Đang xử lý' // Đã xác nhận
    case 2: return 'Đã giao' // Chờ giao
    case 3: return 'Đang giao'
    case 4: return 'Hoàn thành'
    case 5: return 'Đã hủy'
    default: return 'Không xác định'
  }
}

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 0: return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 1: return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 2: return 'bg-indigo-50 text-indigo-700 border border-indigo-200'
    case 3: return 'bg-orange-50 text-orange-700 border border-orange-200'
    case 4: return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 5: return 'bg-red-50 text-red-700 border border-red-200'
    default: return 'bg-gray-50 text-gray-700 border border-gray-200'
  }
}

// Order type helper
const getOrderTypeLabel = (order) => {
  if (!order) return 'Chưa xác định'
  if (order.loaiDon === 0) return 'Tại quầy'
  if (order.loaiDon === 1) return 'Giao hàng'
  if (order.loaiDon === 2) return 'Online'
  return 'Chưa xác định'
}

// Payment method helper
const getPaymentMethodLabel = (order) => {
  if (!order) return 'Chưa xác định'
  
  const payList = order.lichSuThanhToan
  if (!payList || payList.length === 0) {
    // If unpaid, default for delivery/online orders is COD
    if (order.loaiDon === 1 || order.loaiDon === 2) {
      return 'COD'
    }
    return 'Chưa thanh toán'
  }
  
  const methods = new Set()
  payList.forEach(p => {
    const pt = p.phuongThuc
    const note = (p.ghiChu || '').toUpperCase()
    if (pt === '1') {
      methods.add('Tiền mặt')
    } else if (pt === '2') {
      if (note.includes('VNPAY')) {
        methods.add('QR VNPAY')
      } else {
        methods.add('Chuyển khoản')
      }
    } else if (pt === 'COD') {
      methods.add('COD')
    } else {
      methods.add(pt)
    }
  })
  
  return Array.from(methods).join(' + ')
}

// Payment Status Check
const isOrderPaid = (order) => {
  if (!order || !order.lichSuThanhToan || order.lichSuThanhToan.length === 0) return false
  // Sum up payment values
  const totalPaid = order.lichSuThanhToan.reduce((sum, pay) => sum + (pay.soTien || 0), 0)
  return totalPaid >= order.tongTien
}

// Selection Helper
const selectOrder = (order) => {
  selectedOrder.value = order
}

// Open Cancellation dialog
const openCancelDialog = () => {
  cancelReason.value = ''
  cancelError.value = ''
  cancelSuccessMessage.value = ''
  showCancelModal.value = true
}

// Submit Cancellation request
const submitCancelRequest = async () => {
  if (!cancelReason.value.trim()) {
    cancelError.value = 'Vui lòng nhập lý do hủy đơn hàng.'
    return
  }

  isCancelling.value = true
  cancelError.value = ''
  
  try {
    await api.post(`/api/v1/ban-hang/don-hang/${selectedOrder.value.id}/yeu-cau-huy`, null, {
      params: {
        ghiChu: cancelReason.value.trim()
      }
    })
    
    cancelSuccessMessage.value = 'Đã gửi yêu cầu hủy đơn hàng thành công! Đang chờ nhân viên phê duyệt.'
    setTimeout(async () => {
      showCancelModal.value = false
      await fetchOrders()
    }, 2000)
  } catch (error) {
    console.error('Error requesting cancellation:', error)
    cancelError.value = error.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu hủy đơn.'
  } finally {
    isCancelling.value = false
  }
}

// Auto-redirect if tab changes
const setTab = (tabId) => {
  activeTab.value = tabId
  // Auto-select first order of the filtered list
  const filtered = filteredOrders.value
  if (filtered.length > 0) {
    selectedOrder.value = filtered[0]
  } else {
    selectedOrder.value = null
  }
}

onMounted(() => {
  fetchOrders()
})
</script>

<template>
  <main class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 min-h-[80vh]">
    <!-- Breadcrumb -->
    <div class="mb-8 flex items-center justify-between">
      <div class="flex items-center gap-2 text-sm text-on-surface-variant">
        <RouterLink to="/" class="hover:text-primary transition-colors">Trang chủ</RouterLink>
        <span class="material-symbols-outlined text-sm">chevron_right</span>
        <span class="text-on-surface font-semibold">Đơn hàng của tôi</span>
      </div>
      
      <!-- Public lookup button -->
      <RouterLink 
        to="/tra-cuu" 
        class="flex items-center gap-1.5 px-4 py-2 border border-outline-variant hover:bg-surface-container-low text-on-surface rounded-xl text-sm font-semibold transition-all cursor-pointer"
      >
        <span class="material-symbols-outlined text-[18px]">search</span>
        Tra cứu đơn hàng công khai
      </RouterLink>
    </div>

    <!-- Title Header -->
    <div class="mb-8 text-left">
      <h2 class="text-headline-lg font-extrabold text-on-surface tracking-wider uppercase flex items-center gap-2">
        <span class="material-symbols-outlined text-primary text-[32px]">receipt_long</span>
        ĐƠN HÀNG CỦA TÔI
      </h2>
      <p class="text-on-surface-variant text-sm mt-1">Quản lý và theo dõi trạng thái lịch sử tất cả các đơn hàng của Quý Khách.</p>
    </div>

    <!-- Tabs Menu -->
    <div class="border-b border-outline-variant/30 mb-8 overflow-x-auto no-scrollbar flex gap-2">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="setTab(tab.id)"
        :class="activeTab === tab.id ? 'border-primary text-primary font-bold' : 'border-transparent text-on-surface-variant hover:text-on-surface'"
        class="px-4 py-3 border-b-2 font-label-sm text-label-sm tracking-wider uppercase whitespace-nowrap transition-all cursor-pointer"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Loading Screen -->
    <div v-if="isLoading" class="p-20 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl flex flex-col items-center justify-center gap-4 shadow-sm">
      <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <span class="text-sm font-semibold text-on-surface-variant">Đang tải danh sách đơn hàng...</span>
    </div>

    <!-- Error Screen -->
    <div v-else-if="isError" class="p-20 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl text-center space-y-4 shadow-sm">
      <span class="material-symbols-outlined text-red-500 text-6xl">error</span>
      <h3 class="font-headline-md text-lg text-on-surface">Không thể tải thông tin đơn hàng</h3>
      <p class="text-sm text-on-surface-variant">{{ errorMessage }}</p>
      <button 
        @click="fetchOrders"
        class="px-6 py-2.5 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-sm font-semibold transition-all cursor-pointer"
      >
        Tải lại
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredOrders.length === 0" class="p-20 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl text-center space-y-4 shadow-sm">
      <span class="material-symbols-outlined text-gray-400 text-6xl">shopping_cart_checkout</span>
      <h3 class="font-headline-md text-lg text-on-surface">Không tìm thấy đơn hàng nào</h3>
      <p class="text-sm text-on-surface-variant">Quý Khách hiện chưa có đơn hàng nào ở danh mục này.</p>
      <RouterLink 
        to="/all-products" 
        class="inline-block px-6 py-2.5 bg-primary hover:bg-primary/95 text-on-primary rounded-xl text-sm font-bold uppercase transition-all cursor-pointer"
      >
        TIẾP TỤC MUA SẮM
      </RouterLink>
    </div>

    <!-- Split Pane Content -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- Left Column: List of Order Cards (Span 5) -->
      <div class="lg:col-span-5 flex flex-col gap-4 max-h-[800px] overflow-y-auto pr-2 no-scrollbar">
        <div 
          v-for="order in filteredOrders" 
          :key="order.id"
          @click="selectOrder(order)"
          :class="[
            selectedOrder && selectedOrder.id === order.id 
              ? 'border-primary ring-1 ring-primary bg-surface-container-low shadow-md' 
              : 'border-outline-variant/30 hover:border-outline-variant bg-surface-container-lowest'
          ]"
          class="p-5 rounded-2xl border transition-all duration-200 cursor-pointer text-left relative flex flex-col gap-3.5"
        >
          <!-- Card Header: Code & Status Badge -->
          <div class="flex justify-between items-center">
            <span class="text-base font-extrabold text-on-surface">{{ order.maHoaDon }}</span>
            <span 
              :class="getStatusBadgeClass(order.trangThai)"
              class="px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
            >
              {{ getStatusLabel(order.trangThai) }}
            </span>
          </div>

          <!-- Date -->
          <div class="text-xs text-on-surface-variant flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">schedule</span>
            {{ formatDate(order.ngayTao) }}
          </div>

          <!-- Divider -->
          <div class="h-px bg-outline-variant/20"></div>

          <!-- Details Info Summary -->
          <div class="text-sm flex flex-col gap-1.5 text-on-surface-variant">
            <div class="flex justify-between">
              <span>Người nhận:</span>
              <span class="font-bold text-on-surface">{{ order.tenKhachHang }}</span>
            </div>
            <div class="flex justify-between">
              <span>Số điện thoại:</span>
              <span class="font-semibold text-on-surface">{{ order.soDienThoai }}</span>
            </div>
            <div class="flex justify-between">
              <span>Sản phẩm:</span>
              <span class="font-medium text-on-surface">{{ order.danhSachSanPham?.length || 0 }} loại sản phẩm</span>
            </div>
            <div class="flex justify-between items-center">
              <span>Loại đơn:</span>
              <span 
                :class="[
                  order.loaiDon === 0 ? 'bg-slate-100 text-slate-700 border border-slate-200' : '',
                  order.loaiDon === 1 ? 'bg-blue-50 text-blue-700 border border-blue-100' : '',
                  order.loaiDon === 2 ? 'bg-purple-50 text-purple-700 border border-purple-100' : '',
                ]"
                class="px-2 py-0.5 rounded text-[11px] font-bold"
              >
                {{ getOrderTypeLabel(order) }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span>Thanh toán:</span>
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-on-surface text-xs bg-surface-container-high px-2 py-0.5 rounded">
                  {{ getPaymentMethodLabel(order) }}
                </span>
                <span 
                  :class="isOrderPaid(order) ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-gray-500 bg-gray-50 border-gray-100'"
                  class="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                >
                  {{ isOrderPaid(order) ? 'Đã thanh toán' : 'Chưa thanh toán' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Total price -->
          <div class="flex justify-between items-end border-t border-outline-variant/10 pt-3 mt-1">
            <span class="text-xs text-on-surface-variant font-medium">Tổng số tiền:</span>
            <span class="text-lg font-extrabold text-[#ef972d]">{{ formatCurrency(order.tongTien) }}</span>
          </div>
        </div>
      </div>

      <!-- Right Column: Selected Order Details (Span 7) -->
      <div class="lg:col-span-7">
        <div 
          v-if="selectedOrder" 
          class="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-6 md:p-8 flex flex-col gap-6 text-left"
        >
          <!-- Detail Header -->
          <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-outline-variant/30 pb-5">
            <div>
              <h3 class="text-lg font-extrabold text-on-surface">CHI TIẾT ĐƠN HÀNG</h3>
              <p class="text-xs text-on-surface-variant mt-1.5">
                Mã đơn: <span class="font-bold text-on-surface">{{ selectedOrder.maHoaDon }}</span> | Đặt lúc: {{ formatDate(selectedOrder.ngayTao) }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span 
                :class="getStatusBadgeClass(selectedOrder.trangThai)"
                class="px-3.5 py-1 rounded-full text-xs font-extrabold whitespace-nowrap uppercase tracking-wider"
              >
                {{ getStatusLabel(selectedOrder.trangThai) }}
              </span>
              <!-- Cancellation Request Alert/State -->
              <span 
                v-if="selectedOrder.trangThaiYeuCauHuy === 1"
                class="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold"
              >
                Chờ xác nhận hủy
              </span>
            </div>
          </div>

          <!-- Inner Sections Grid -->
          <div class="flex flex-col gap-6">
            
            <!-- Recipient Info Card -->
            <div class="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30">
              <h4 class="text-label-md font-bold uppercase tracking-wider text-on-surface border-b border-outline-variant/30 pb-3 mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[20px]">person_pin_circle</span>
                Thông Tin Nhận Hàng
              </h4>
              <div class="flex flex-col gap-3 text-sm text-on-surface-variant">
                <div class="flex">
                  <span class="w-32 font-medium shrink-0">Người nhận:</span> 
                  <span class="font-bold text-on-surface">{{ selectedOrder.tenKhachHang }}</span>
                </div>
                <div class="flex">
                  <span class="w-32 font-medium shrink-0">Số điện thoại:</span> 
                  <span class="font-semibold text-on-surface">{{ selectedOrder.soDienThoai }}</span>
                </div>
                <div class="flex">
                  <span class="w-32 font-medium shrink-0">Email:</span> 
                  <span class="text-on-surface">{{ selectedOrder.email || '—' }}</span>
                </div>
                <div class="flex">
                  <span class="w-32 font-medium shrink-0">Địa chỉ giao:</span> 
                  <span class="text-on-surface flex-1 leading-relaxed">{{ selectedOrder.diaChi }}</span>
                </div>
                <div class="flex" v-if="selectedOrder.ghiChu">
                  <span class="w-32 font-medium shrink-0">Ghi chú:</span> 
                  <span class="text-on-surface italic flex-1">"{{ selectedOrder.ghiChu }}"</span>
                </div>
              </div>
            </div>

            <!-- Products List Card -->
            <div class="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30">
              <h4 class="text-label-md font-bold uppercase tracking-wider text-on-surface border-b border-outline-variant/30 pb-3 mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[20px]">local_mall</span>
                Danh Sách Sản Phẩm
              </h4>
              
              <div class="flex flex-col gap-4">
                <div 
                  v-for="item in selectedOrder.danhSachSanPham" 
                  :key="item.id" 
                  class="flex gap-4 border-b border-outline-variant/20 pb-4 last:border-b-0 last:pb-0"
                >
                  <!-- Thumbnail image -->
                  <div class="w-16 h-20 bg-surface rounded-lg overflow-hidden border border-outline-variant/20 flex-shrink-0 flex items-center justify-center">
                    <img 
                      v-if="item.anhSanPham" 
                      :src="formatImage(item.anhSanPham)" 
                      class="w-full h-full object-cover" 
                      alt="product image"
                    />
                    <span v-else class="material-symbols-outlined text-[32px] text-on-surface-variant">image</span>
                  </div>
                  
                  <!-- Details -->
                  <div class="flex-1 flex flex-col justify-between">
                    <div>
                      <h5 class="text-sm font-bold text-on-surface line-clamp-2 leading-tight">{{ item.tenSanPham }}</h5>
                      <p class="text-xs text-on-surface-variant mt-1">Phân loại: {{ item.tenMauSac }}, {{ item.tenKichCo }}</p>
                    </div>
                    <div class="flex justify-between items-center mt-2">
                      <span class="text-xs text-on-surface-variant">Số lượng: <span class="font-bold text-on-surface">{{ item.soLuong }}</span></span>
                      <span class="text-sm font-bold text-[#ef972d]">{{ formatCurrency(item.donGiaSauGiam || item.donGia) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pricing Summary Card -->
            <div class="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30">
              <h4 class="text-label-md font-bold uppercase tracking-wider text-on-surface border-b border-outline-variant/30 pb-3 mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[20px]">receipt_long</span>
                Tổng Kết Tài Chính
              </h4>
              <div class="flex flex-col gap-3 text-sm border-b border-outline-variant/20 pb-4 mb-4 text-on-surface-variant">
                <div class="flex justify-between">
                  <span>Tổng tiền hàng:</span> 
                  <span class="font-semibold text-on-surface">{{ formatCurrency(selectedOrder.tongTienHang) }}</span>
                </div>
                <div class="flex justify-between text-red-500" v-if="selectedOrder.giamGia > 0">
                  <span>Giảm giá:</span> 
                  <span class="font-semibold">-{{ formatCurrency(selectedOrder.giamGia) }}</span>
                </div>
                <div class="flex justify-between" v-if="selectedOrder.phiVanChuyen > 0">
                  <span>Phí vận chuyển:</span> 
                  <span class="font-semibold text-on-surface">+{{ formatCurrency(selectedOrder.phiVanChuyen) }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Loại đơn hàng:</span> 
                  <span class="font-bold text-on-surface">{{ getOrderTypeLabel(selectedOrder) }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Phương thức thanh toán:</span> 
                  <span class="font-bold text-on-surface">{{ getPaymentMethodLabel(selectedOrder) }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span>Trạng thái thanh toán:</span> 
                  <span 
                    :class="isOrderPaid(selectedOrder) ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-gray-500 bg-gray-50 border-gray-100'"
                    class="text-xs font-bold px-2 py-0.5 rounded border"
                  >
                    {{ isOrderPaid(selectedOrder) ? 'Đã thanh toán' : 'Chưa thanh toán' }}
                  </span>
                </div>
              </div>
              <div class="flex justify-between items-center mt-2">
                <span class="text-sm font-extrabold text-on-surface">TỔNG CỘNG THANH TOÁN:</span>
                <span class="text-xl font-black text-[#ef972d]">{{ formatCurrency(selectedOrder.tongTien) }}</span>
              </div>
            </div>
            
            <!-- Actions Box: Show Cancel Button for Pending Orders -->
            <div 
              v-if="(selectedOrder.trangThai === 0 || selectedOrder.trangThai === 1) && selectedOrder.trangThaiYeuCauHuy !== 1" 
              class="flex flex-col gap-3 mt-2"
            >
              <button 
                @click="openCancelDialog"
                class="w-full py-3 bg-red-50 border border-red-200 hover:bg-red-100/50 text-red-600 rounded-xl font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <span class="material-symbols-outlined text-[20px]">cancel</span>
                Yêu cầu hủy đơn hàng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Cancellation Modal Dialog -->
    <div 
      v-if="showCancelModal" 
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div 
        @click.stop
        class="bg-surface border border-outline-variant/30 w-full max-w-md rounded-2xl shadow-2xl p-6 relative flex flex-col gap-4 text-left"
      >
        <div class="flex justify-between items-center border-b border-outline-variant/20 pb-3">
          <h3 class="text-base font-extrabold text-on-surface uppercase flex items-center gap-1.5">
            <span class="material-symbols-outlined text-red-500">warning</span>
            HỦY ĐƠN HÀNG
          </h3>
          <button 
            @click="showCancelModal = false"
            class="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <p class="text-sm text-on-surface-variant leading-relaxed">
          Quý Khách có chắc chắn muốn hủy đơn hàng <span class="font-bold text-on-surface">{{ selectedOrder?.maHoaDon }}</span> không? Vui lòng cho cửa hàng biết lý do hủy đơn:
        </p>

        <!-- Form fields -->
        <div class="flex flex-col gap-2">
          <label class="text-xs font-bold text-on-surface uppercase tracking-wider">Lý do hủy đơn *</label>
          <textarea 
            v-model="cancelReason" 
            rows="3" 
            class="w-full border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-on-surface-variant/50" 
            placeholder="Nhập lý do chi tiết..."
          ></textarea>
        </div>

        <!-- Messages -->
        <p v-if="cancelError" class="text-xs font-semibold text-red-500 bg-red-50 border border-red-100 p-2.5 rounded-lg flex items-center gap-1.5">
          <span class="material-symbols-outlined text-sm">error</span>
          {{ cancelError }}
        </p>
        <p v-if="cancelSuccessMessage" class="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg flex items-center gap-1.5">
          <span class="material-symbols-outlined text-sm">check_circle</span>
          {{ cancelSuccessMessage }}
        </p>

        <!-- Actions -->
        <div class="flex justify-end gap-3 border-t border-outline-variant/20 pt-4 mt-1">
          <button 
            @click="showCancelModal = false" 
            class="px-4 py-2 border border-outline-variant text-on-surface hover:bg-surface-container-low rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            :disabled="isCancelling"
          >
            Quay lại
          </button>
          <button 
            @click="submitCancelRequest" 
            class="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer flex items-center gap-1"
            :disabled="isCancelling"
          >
            <span v-if="isCancelling" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></span>
            Xác nhận hủy
          </button>
        </div>
      </div>
    </div>
  </main>
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

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import { formatCurrency as utilsFormatCurrency, formatDateTime as utilsFormatDateTime } from '@/utils/format'

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
  { id: '1', label: 'Đã xác nhận' },
  { id: '2', label: 'Chờ giao' },
  { id: '3', label: 'Đang giao' },
  { id: '4', label: 'Hoàn thành' },
  { id: '5', label: 'Đã hủy' },
  { id: '6', label: 'Giao thất bại' }
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

    // Enrich product list with original price (giaGoc) if missing or equal to donGia
    if (orders.value && orders.value.length > 0) {
      for (const ord of orders.value) {
        if (ord.danhSachSanPham && ord.danhSachSanPham.length > 0) {
          await Promise.all(ord.danhSachSanPham.map(async (item) => {
            const vId = item.idChiTietSanPham || item.idChiTiet || item.chiTietSanPhamId
            if (vId) {
              try {
                const vRes = await api.get(`/api/v1/chi-tiet-san-pham/${vId}`).catch(() => null)
                if (vRes && vRes.data && vRes.data.giaBan) {
                  const origPrice = Number(vRes.data.giaBan)
                  const currentPrice = Number(item.donGiaSauGiam || item.donGia || item.price || 0)
                  if (origPrice > currentPrice) {
                    item.giaGoc = origPrice
                  }
                }
              } catch (e) {}
            }
          }))
        }
      }
    }

    // Auto-select first order if exists and not already selected
    if (orders.value.length > 0) {
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
  return utilsFormatCurrency(val)
}

// Date Formatter
const formatDate = (dateStr) => {
  return utilsFormatDateTime(dateStr)
}

// Status Badges & Styling Helpers
const getStatusLabel = (status) => {
  switch (status) {
    case 0: return 'Chờ xác nhận'
    case 1: return 'Đã xác nhận'
    case 2: return 'Chờ giao'
    case 3: return 'Đang giao'
    case 4: return 'Hoàn thành'
    case 5: return 'Đã hủy'
    case 6: return 'Giao hàng không thành công'
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
    case 6: return 'bg-rose-50 text-rose-700 border border-rose-200'
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
  if (!order) return false
  // Đơn hàng đã hoàn thành (trangThai === 4) hoặc có cờ đã thanh toán
  if (order.trangThai === 4 || order.trangThaiThanhToan === 1 || order.trangThaiThanhToan === '1' || order.daThanhToan) return true
  if (!order.lichSuThanhToan || order.lichSuThanhToan.length === 0) return false
  const totalPaid = order.lichSuThanhToan.reduce((sum, pay) => sum + (pay.soTien || 0), 0)
  return totalPaid >= (order.tongTien || 0)
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
  <main class="min-h-screen bg-[#FAF9F6] text-gray-800 py-10 px-4 sm:px-6 lg:px-8">
    <div class="max-w-6xl mx-auto space-y-6">
      
      <!-- 1. Hero Header Banner (Brand Navy #0D2533 & Orange #EF972D) -->
      <div class="bg-[#0D2533] text-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden border border-gray-800">
        <div class="absolute -top-12 -right-12 w-48 h-48 bg-[#EF972D]/10 rounded-full blur-2xl pointer-events-none"></div>

        <div class="flex items-center gap-4 relative z-10">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#EF972D] to-[#d87f1d] text-white flex items-center justify-center font-bold shadow-lg border border-white/20">
            <span class="material-symbols-outlined text-3xl">receipt_long</span>
          </div>
          <div class="space-y-1">
            <span class="inline-block px-3 py-0.5 bg-[#EF972D]/20 text-[#EF972D] text-[10px] font-extrabold uppercase tracking-widest rounded-full border border-[#EF972D]/30">
              LỊCH SỬ MUA SẮM
            </span>
            <h1 class="text-xl md:text-2xl font-black uppercase tracking-tight text-white">
              ĐƠN HÀNG CỦA TÔI
            </h1>
            <p class="text-xs text-gray-300 font-medium">
              Quản lý và theo dõi trạng thái lịch sử tất cả các đơn hàng của Quý Khách.
            </p>
          </div>
        </div>

        <RouterLink 
          to="/tra-cuu" 
          class="relative z-10 inline-flex items-center gap-2 px-5 py-3 bg-[#EF972D] hover:bg-[#d87f1d] active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-xl cursor-pointer"
        >
          <span class="material-symbols-outlined text-base">search</span>
          Tra cứu đơn công khai
        </RouterLink>
      </div>

      <!-- 2. Status Tabs Bar -->
      <div class="bg-white rounded-2xl p-2 border border-gray-150 shadow-sm overflow-x-auto no-scrollbar flex items-center gap-1.5">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          @click="setTab(tab.id)"
          class="px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer"
          :class="activeTab === tab.id ? 'bg-[#EF972D] text-white shadow-md shadow-[#EF972D]/20' : 'text-gray-600 hover:bg-gray-100 hover:text-[#EF972D]'"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 3. Loading Screen -->
      <div v-if="isLoading" class="p-20 bg-white border border-gray-150 rounded-3xl text-center space-y-3 shadow-sm">
        <span class="material-symbols-outlined animate-spin text-4xl text-[#EF972D]">progress_activity</span>
        <p class="text-xs font-extrabold uppercase text-gray-600 tracking-wider">Đang tải danh sách đơn hàng...</p>
      </div>

      <!-- 4. Error Screen -->
      <div v-else-if="isError" class="p-16 bg-white border border-gray-150 rounded-3xl text-center space-y-4 shadow-sm">
        <div class="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
          <span class="material-symbols-outlined text-3xl">error</span>
        </div>
        <h3 class="text-base font-bold text-gray-900 uppercase">Không thể tải thông tin đơn hàng</h3>
        <p class="text-xs text-gray-500 max-w-md mx-auto">{{ errorMessage }}</p>
        <button 
          @click="fetchOrders"
          class="px-6 py-2.5 bg-[#EF972D] hover:bg-[#d87f1d] text-white rounded-xl text-xs font-bold uppercase transition-all shadow-md cursor-pointer"
        >
          TẢI LẠI
        </button>
      </div>

      <!-- 5. Empty State -->
      <div v-else-if="filteredOrders.length === 0" class="p-16 bg-white border border-gray-150 rounded-3xl text-center space-y-4 shadow-sm">
        <div class="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
          <span class="material-symbols-outlined text-4xl">shopping_cart_checkout</span>
        </div>
        <div class="space-y-1">
          <h3 class="text-base font-bold text-gray-900 uppercase">CHƯA CÓ ĐƠN HÀNG NÀO</h3>
          <p class="text-xs text-gray-500">Quý Khách hiện chưa có đơn hàng nào thuộc danh mục này.</p>
        </div>
        <RouterLink 
          to="/all-products" 
          class="inline-block px-6 py-3 bg-[#EF972D] hover:bg-[#d87f1d] text-white rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all shadow-md cursor-pointer"
        >
          MUA SẮM NGAY
        </RouterLink>
      </div>

      <!-- 6. Split View Content Grid -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- Left Column: List of Orders (Span 5) -->
        <div class="lg:col-span-5 flex flex-col gap-4 max-h-[820px] overflow-y-auto pr-2 custom-scrollbar">
          <div 
            v-for="order in filteredOrders" 
            :key="order.id"
            @click="selectOrder(order)"
            class="p-5 rounded-3xl border-2 transition-all duration-200 cursor-pointer text-left relative flex flex-col gap-3"
            :class="[
              selectedOrder && selectedOrder.id === order.id 
                ? 'border-[#EF972D] bg-[#EF972D]/5 shadow-lg shadow-[#EF972D]/10' 
                : 'border-gray-150 bg-white hover:border-[#EF972D]/50'
            ]"
          >
            <!-- Card Header: Code & Status Badge -->
            <div class="flex justify-between items-center gap-2">
              <span class="text-sm font-black text-gray-900 flex items-center gap-1">
                <span class="material-symbols-outlined text-base text-gray-400">receipt</span>
                {{ order.maHoaDon }}
              </span>
              <span 
                :class="getStatusBadgeClass(order.trangThai)"
                class="px-3 py-0.5 rounded-full text-[11px] font-extrabold whitespace-nowrap uppercase tracking-wider"
              >
                {{ getStatusLabel(order.trangThai) }}
              </span>
            </div>

            <!-- Date -->
            <div class="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
              <span class="material-symbols-outlined text-xs">schedule</span>
              {{ formatDate(order.ngayTao) }}
            </div>

            <div class="border-t border-dashed border-gray-200 my-0.5"></div>

            <!-- Summary Details -->
            <div class="text-xs flex flex-col gap-1.5 text-gray-600">
              <div class="flex justify-between">
                <span>Người nhận:</span>
                <span class="font-bold text-gray-900">{{ order.tenKhachHang }}</span>
              </div>
              <div class="flex justify-between">
                <span>Số điện thoại:</span>
                <span class="font-semibold text-gray-800">{{ order.soDienThoai }}</span>
              </div>
              <div class="flex justify-between">
                <span>Sản phẩm:</span>
                <span class="font-bold text-gray-800">{{ order.danhSachSanPham?.length || 0 }} loại sản phẩm</span>
              </div>
              <div class="flex justify-between items-center pt-1">
                <span>Thanh toán:</span>
                <div class="flex items-center gap-1.5">
                  <span class="font-bold text-gray-800 text-[11px] bg-gray-100 px-2 py-0.5 rounded">
                    {{ getPaymentMethodLabel(order) }}
                  </span>
                  <span 
                    :class="isOrderPaid(order) ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-gray-600 bg-gray-100 border-gray-200'"
                    class="text-[10px] font-bold px-2 py-0.5 rounded border uppercase"
                  >
                    {{ isOrderPaid(order) ? 'Đã thanh toán' : 'Chưa thanh toán' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Total Price -->
            <div class="flex justify-between items-end pt-2 border-t border-gray-100 mt-1">
              <span class="text-xs text-gray-500 font-bold uppercase tracking-wider">Tổng số tiền:</span>
              <span class="text-base font-black text-[#EF972D]">{{ formatCurrency(order.tongTien) }}</span>
            </div>
          </div>
        </div>

        <!-- Right Column: Selected Order Details (Span 7) -->
        <div class="lg:col-span-7">
          <div 
            v-if="selectedOrder" 
            class="bg-white rounded-3xl border border-gray-150 shadow-xl p-6 md:p-8 flex flex-col gap-6 text-left"
          >
            <!-- Detail Header -->
            <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-gray-150 pb-5">
              <div class="space-y-1">
                <h3 class="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <span class="material-symbols-outlined text-[#EF972D]">receipt</span>
                  CHI TIẾT ĐƠN HÀNG
                </h3>
                <p class="text-xs text-gray-500 font-medium">
                  Mã đơn: <strong class="text-gray-900 font-extrabold">{{ selectedOrder.maHoaDon }}</strong> | Đặt lúc: {{ formatDate(selectedOrder.ngayTao) }}
                </p>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <span 
                  :class="getStatusBadgeClass(selectedOrder.trangThai)"
                  class="px-3.5 py-1 rounded-full text-xs font-black whitespace-nowrap uppercase tracking-wider shadow-sm"
                >
                  {{ getStatusLabel(selectedOrder.trangThai) }}
                </span>
                <span 
                  v-if="selectedOrder.trangThaiYeuCauHuy === 1"
                  class="bg-amber-500 text-white border border-amber-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm"
                >
                  Chờ xác nhận hủy
                </span>
              </div>
            </div>

            <!-- Detail Sections -->
            <div class="flex flex-col gap-6">
              
              <!-- Recipient Info Card -->
              <div class="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-3">
                <h4 class="text-xs font-black uppercase tracking-wider text-gray-900 border-b border-gray-200 pb-2.5 flex items-center gap-2">
                  <span class="material-symbols-outlined text-[#EF972D] text-lg">person_pin_circle</span>
                  Thông Tin Nhận Hàng
                </h4>
                <div class="grid grid-cols-1 gap-2 text-xs text-gray-600">
                  <div class="flex">
                    <span class="w-32 font-bold shrink-0 text-gray-700">Người nhận:</span> 
                    <span class="font-extrabold text-gray-900">{{ selectedOrder.tenKhachHang }}</span>
                  </div>
                  <div class="flex">
                    <span class="w-32 font-bold shrink-0 text-gray-700">Số điện thoại:</span> 
                    <span class="font-bold text-gray-900">{{ selectedOrder.soDienThoai }}</span>
                  </div>
                  <div class="flex">
                    <span class="w-32 font-bold shrink-0 text-gray-700">Email:</span> 
                    <span class="text-gray-900 font-medium">{{ selectedOrder.email || '—' }}</span>
                  </div>
                  <div class="flex">
                    <span class="w-32 font-bold shrink-0 text-gray-700">Địa chỉ giao:</span> 
                    <span class="text-gray-900 font-medium leading-relaxed flex-1">{{ selectedOrder.diaChi }}</span>
                  </div>
                  <div class="flex" v-if="selectedOrder.ghiChu">
                    <span class="w-32 font-bold shrink-0 text-gray-700">Ghi chú:</span> 
                    <span class="text-gray-800 italic flex-1">"{{ selectedOrder.ghiChu }}"</span>
                  </div>
                </div>
              </div>

              <!-- Products List Card -->
              <div class="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-3">
                <h4 class="text-xs font-black uppercase tracking-wider text-gray-900 border-b border-gray-200 pb-2.5 flex items-center gap-2">
                  <span class="material-symbols-outlined text-[#EF972D] text-lg">local_mall</span>
                  Danh Sách Sản Phẩm ({{ selectedOrder.danhSachSanPham?.length || 0 }})
                </h4>
                
                <div class="flex flex-col gap-3.5 divide-y divide-gray-200">
                  <div 
                    v-for="item in selectedOrder.danhSachSanPham" 
                    :key="item.id" 
                    class="pt-3.5 first:pt-0 flex gap-3.5 items-center"
                  >
                    <!-- Thumbnail image -->
                    <div class="w-16 h-16 rounded-xl bg-white overflow-hidden border border-gray-200 shrink-0 shadow-sm flex items-center justify-center">
                      <img 
                        v-if="item.anhSanPham" 
                        :src="formatImage(item.anhSanPham)" 
                        class="w-full h-full object-cover" 
                        alt="product image"
                      />
                      <span v-else class="material-symbols-outlined text-2xl text-gray-300">image</span>
                    </div>
                    
                    <!-- Details -->
                    <div class="flex-1 min-w-0 space-y-1">
                      <h5 class="text-xs font-bold text-gray-900 line-clamp-1 hover:text-[#EF972D] transition-colors">
                        {{ item.tenSanPham }}
                      </h5>
                      <div class="text-[11px] text-gray-500 flex flex-wrap gap-x-3">
                        <span v-if="item.maChiTietSanPham || item.maSanPham">Mã: <strong class="font-mono text-gray-800">{{ item.maChiTietSanPham || item.maSanPham }}</strong></span>
                        <span>Phân loại: <strong class="text-gray-800">{{ item.tenMauSac }}, Size {{ item.tenKichCo }}</strong></span>
                        <span>Số lượng: <strong class="text-gray-800">{{ item.soLuong }}</strong></span>
                      </div>
                      <div class="text-xs font-extrabold text-[#EF972D] pt-0.5 flex flex-col items-start gap-0.5">
                        <span v-if="(item.giaGoc || item.giaBanDau || item.originalPrice || item.giaBan) && Number(item.giaGoc || item.giaBanDau || item.originalPrice || item.giaBan) > Number(item.donGiaSauGiam || item.donGia)" class="line-through text-xs text-gray-400 font-normal">
                          {{ formatCurrency(item.giaGoc || item.giaBanDau || item.originalPrice || item.giaBan) }}
                        </span>
                        <span>{{ formatCurrency(item.donGiaSauGiam || item.donGia) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Pricing Summary Card -->
              <div class="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-3">
                <h4 class="text-xs font-black uppercase tracking-wider text-gray-900 border-b border-gray-200 pb-2.5 flex items-center gap-2">
                  <span class="material-symbols-outlined text-[#EF972D] text-lg">receipt_long</span>
                  Tổng Kết Tài Chính
                </h4>
                <div class="flex flex-col gap-2.5 text-xs border-b border-gray-200 pb-3.5 text-gray-600">
                  <div class="flex justify-between">
                    <span>Tổng tiền hàng:</span> 
                    <span class="font-bold text-gray-900">{{ formatCurrency(selectedOrder.tongTienHang) }}</span>
                  </div>
                  <div class="flex justify-between text-red-600" v-if="selectedOrder.giamGia > 0">
                    <span>Giảm giá Voucher / Đợt giảm giá:</span> 
                    <span class="font-bold">-{{ formatCurrency(selectedOrder.giamGia) }}</span>
                  </div>
                  <div class="flex justify-between" v-if="selectedOrder.phiVanChuyen > 0">
                    <span>Phí vận chuyển:</span> 
                    <span class="font-bold text-gray-900">+{{ formatCurrency(selectedOrder.phiVanChuyen) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Loại đơn hàng:</span> 
                    <span class="font-bold text-gray-900">{{ getOrderTypeLabel(selectedOrder) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Phương thức thanh toán:</span> 
                    <span class="font-bold text-gray-900">{{ getPaymentMethodLabel(selectedOrder) }}</span>
                  </div>
                  <div class="flex justify-between items-center pt-1">
                    <span>Trạng thái thanh toán:</span> 
                    <span 
                      :class="isOrderPaid(selectedOrder) ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-gray-600 bg-gray-100 border-gray-200'"
                      class="text-[11px] font-bold px-2.5 py-0.5 rounded border uppercase"
                    >
                      {{ isOrderPaid(selectedOrder) ? 'Đã thanh toán' : 'Chưa thanh toán' }}
                    </span>
                  </div>
                </div>
                <div class="flex justify-between items-center pt-1">
                  <span class="text-xs font-black uppercase text-gray-900 tracking-wider">TỔNG CỘNG THANH TOÁN:</span>
                  <span class="text-xl font-black text-[#EF972D]">{{ formatCurrency(selectedOrder.tongTien) }}</span>
                </div>
              </div>
              
              <!-- Actions Box: Show Cancel Button for Pending Orders -->
              <div 
                v-if="(selectedOrder.trangThai === 0 || selectedOrder.trangThai === 1 || selectedOrder.trangThai === 2) && selectedOrder.trangThaiYeuCauHuy !== 1" 
                class="pt-1"
              >
                <button 
                  @click="openCancelDialog"
                  class="w-full py-3.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 rounded-2xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <span class="material-symbols-outlined text-base">cancel</span>
                  YÊU CẦU HỦY ĐƠN HÀNG NÀY
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Cancellation Modal Dialog -->
    <div 
      v-if="showCancelModal" 
      class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <div 
        @click.stop
        class="bg-white border border-gray-200 w-full max-w-md rounded-3xl shadow-2xl p-6 md:p-8 relative flex flex-col gap-4 text-left"
      >
        <div class="flex justify-between items-center border-b border-gray-150 pb-3">
          <h3 class="text-base font-black text-gray-900 uppercase flex items-center gap-2">
            <span class="material-symbols-outlined text-red-600">warning</span>
            HỦY ĐƠN HÀNG
          </h3>
          <button 
            @click="showCancelModal = false"
            class="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <p class="text-xs text-gray-600 leading-relaxed font-medium">
          Quý Khách có chắc chắn muốn hủy đơn hàng <strong class="text-gray-900 font-extrabold">{{ selectedOrder?.maHoaDon }}</strong> không? Vui lòng điền lý do hủy đơn:
        </p>

        <!-- Form fields -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-extrabold text-gray-700 uppercase tracking-wider">Lý do hủy đơn *</label>
          <textarea 
            v-model="cancelReason" 
            rows="3" 
            class="w-full border border-gray-200 rounded-2xl p-3 text-xs font-semibold focus:outline-none focus:border-[#EF972D] focus:ring-2 focus:ring-[#EF972D]/20 placeholder:text-gray-400 bg-gray-50" 
            placeholder="Nhập lý do chi tiết..."
          ></textarea>
        </div>

        <!-- Messages -->
        <p v-if="cancelError" class="text-xs font-bold text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl flex items-center gap-1.5">
          <span class="material-symbols-outlined text-base">error</span>
          {{ cancelError }}
        </p>
        <p v-if="cancelSuccessMessage" class="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-1.5">
          <span class="material-symbols-outlined text-base">check_circle</span>
          {{ cancelSuccessMessage }}
        </p>

        <!-- Actions -->
        <div class="flex justify-end gap-3 border-t border-gray-150 pt-4 mt-1">
          <button 
            @click="showCancelModal = false" 
            class="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
            :disabled="isCancelling"
          >
            Quay lại
          </button>
          <button 
            @click="submitCancelRequest" 
            class="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold uppercase transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
            :disabled="isCancelling"
          >
            <span v-if="isCancelling" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
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

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'
import { formatCurrency, formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const maHoaDonInput = ref('')
const emailInput = ref('')

const isLoading = ref(false)
const order = ref(null)
const errorMessage = ref('')
const successMessage = ref('')

// Cancel Order Modal State
const showCancelModal = ref(false)
const cancelReason = ref('')
const isCancelling = ref(false)
const cancelError = ref('')

// Load details automatically if query parameters are present in URL
onMounted(() => {
  const queryMaHoaDon = route.query.maHoaDon
  const queryEmail = route.query.email

  if (queryMaHoaDon && queryEmail) {
    maHoaDonInput.value = queryMaHoaDon
    emailInput.value = queryEmail
    handleSearch()
  }
})

const handleSearch = async () => {
  if (!maHoaDonInput.value.trim() || !emailInput.value.trim()) {
    errorMessage.value = 'Vui lòng điền đầy đủ Mã đơn hàng và Email.'
    order.value = null
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const response = await api.get('/api/v1/hoa-don/tra-cuu', {
      params: {
        maHoaDon: maHoaDonInput.value.trim(),
        email: emailInput.value.trim()
      }
    })
    
    if (response.data) {
      order.value = response.data
      
      // Update browser query parameters without reloading the page
      router.replace({
        path: route.path,
        query: {
          maHoaDon: maHoaDonInput.value.trim(),
          email: emailInput.value.trim()
        }
      })
    } else {
      errorMessage.value = 'Không tìm thấy hóa đơn hoặc thông tin không trùng khớp.'
      order.value = null
    }
  } catch (error) {
    console.error('Error looking up order:', error)
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = 'Không tìm thấy hóa đơn. Vui lòng kiểm tra lại thông tin.'
    }
    order.value = null
  } finally {
    isLoading.value = false
  }
}

const openCancelModal = () => {
  cancelReason.value = ''
  cancelError.value = ''
  showCancelModal.value = true
}

const closeCancelModal = () => {
  showCancelModal.value = false
}

const submitCancelRequest = async () => {
  if (!cancelReason.value.trim()) {
    cancelError.value = 'Vui lòng nhập lý do hủy đơn hàng.'
    return
  }

  isCancelling.value = true
  cancelError.value = ''

  try {
    await api.post(`/api/v1/ban-hang/don-hang/${order.value.id}/yeu-cau-huy`, null, {
      params: {
        ghiChu: cancelReason.value.trim()
      }
    })
    
    successMessage.value = 'Gửi yêu cầu hủy đơn hàng thành công! Đang chờ nhân viên phê duyệt.'
    showCancelModal.value = false
    
    // Refresh order details
    await handleSearch()
  } catch (error) {
    console.error('Error requesting order cancellation:', error)
    if (error.response && error.response.data && error.response.data.message) {
      cancelError.value = error.response.data.message
    } else {
      cancelError.value = 'Có lỗi xảy ra khi gửi yêu cầu hủy đơn. Vui lòng thử lại.'
    }
  } finally {
    isCancelling.value = false
  }
}

const formatImage = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150'
  if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${apiBase.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

const formatDate = (dateStr) => {
  return formatDateTime(dateStr)
}

const getStatusText = (status) => {
  switch (status) {
    case 0: return 'Chờ xác nhận'
    case 1: return 'Đã xác nhận'
    case 2: return 'Chờ giao hàng'
    case 3: return 'Đang giao hàng'
    case 4: return 'Hoàn thành'
    case 5: return 'Đã hủy'
    case 6: return 'Giao hàng không thành công'
    default: return 'Không xác định'
  }
}

// Payment Status Check
const isOrderPaid = (orderObj) => {
  if (!orderObj || !orderObj.lichSuThanhToan || orderObj.lichSuThanhToan.length === 0) return false
  const totalPaid = orderObj.lichSuThanhToan.reduce((sum, pay) => sum + (pay.soTien || 0), 0)
  return totalPaid >= orderObj.tongTien
}

// Order type helper
const getOrderTypeLabel = (orderObj) => {
  if (!orderObj) return 'Chưa xác định'
  if (orderObj.loaiDon === 0) return 'Tại quầy'
  if (orderObj.loaiDon === 1) return 'Giao hàng'
  if (orderObj.loaiDon === 2) return 'Online'
  return 'Chưa xác định'
}

// Payment method helper
const getPaymentMethodLabel = (orderObj) => {
  if (!orderObj) return 'Chưa xác định'
  
  const payList = orderObj.lichSuThanhToan
  if (!payList || payList.length === 0) {
    if (orderObj.loaiDon === 1 || orderObj.loaiDon === 2) {
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

// Steps for the stepper
const steps = [
  { status: 0, label: 'Chờ xác nhận', icon: 'pending_actions' },
  { status: 1, label: 'Đã xác nhận', icon: 'check_circle' },
  { status: 2, label: 'Chờ giao hàng', icon: 'local_shipping' },
  { status: 3, label: 'Đang giao hàng', icon: 'conversion_path' },
  { status: 4, label: 'Hoàn thành', icon: 'task_alt' }
]
</script>

<template>
  <main class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 min-h-[70vh]">
    <!-- Breadcrumb -->
    <div class="mb-8 flex items-center gap-2 text-sm text-on-surface-variant">
      <RouterLink to="/" class="hover:text-primary transition-colors">Trang chủ</RouterLink>
      <span class="material-symbols-outlined text-sm">chevron_right</span>
      <span class="text-on-surface font-semibold">Tra cứu đơn hàng</span>
    </div>

    <!-- Search Section -->
    <div class="bg-surface-container-lowest p-6 md:p-8 rounded-2xl border border-outline-variant/30 shadow-sm max-w-3xl mx-auto mb-10">
      <div class="text-center mb-8">
        <h2 class="text-headline-lg font-bold text-on-surface tracking-wider uppercase">TRA CỨU ĐƠN HÀNG</h2>
        <p class="text-on-surface-variant mt-2 text-sm">Nhập mã hóa đơn và địa chỉ email đăng ký mua hàng để xem chi tiết.</p>
      </div>

      <form @submit.prevent="handleSearch" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-label-sm font-semibold text-on-surface mb-2">Mã Đơn Hàng <span class="text-red-500">*</span></label>
          <input 
            v-model="maHoaDonInput"
            type="text" 
            placeholder="Ví dụ: HD00008" 
            class="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-sm"
            required
          />
        </div>
        <div>
          <label class="block text-label-sm font-semibold text-on-surface mb-2">Email Đặt Hàng <span class="text-red-500">*</span></label>
          <input 
            v-model="emailInput"
            type="email" 
            placeholder="Ví dụ: cuong.le@example.com" 
            class="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-sm"
            required
          />
        </div>
        <div class="md:col-span-2 mt-4">
          <button 
            type="submit" 
            class="w-full bg-primary hover:bg-primary/95 text-on-primary font-bold uppercase tracking-wider py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="w-5 h-5 border-2 border-t-transparent border-on-primary rounded-full animate-spin"></span>
            <span v-else class="material-symbols-outlined">search</span>
            <span>TRA CỨU NGAY</span>
          </button>
        </div>
      </form>

      <!-- Messages inside form card -->
      <div v-if="errorMessage" class="mt-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 flex items-center gap-2">
        <span class="material-symbols-outlined">error</span>
        <span>{{ errorMessage }}</span>
      </div>

      <div v-if="successMessage" class="mt-4 p-4 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200 flex items-center gap-2">
        <span class="material-symbols-outlined">check_circle</span>
        <span>{{ successMessage }}</span>
      </div>
    </div>

    <!-- Tracking Results Section -->
    <div v-if="order" class="bg-surface-container-lowest p-6 md:p-8 rounded-2xl border border-outline-variant/30 shadow-sm max-w-5xl mx-auto flex flex-col gap-8">
      
      <!-- Stepper / Timeline -->
      <div class="border-b border-outline-variant/30 pb-8">
        <div class="flex flex-col md:flex-row justify-between items-center mb-6">
          <div>
            <span class="text-sm font-semibold uppercase tracking-wider text-on-surface-variant">Chi tiết đơn hàng:</span>
            <h3 class="text-headline-md font-bold text-primary mt-1">{{ order.maHoaDon }}</h3>
          </div>
          <div class="text-right mt-3 md:mt-0">
            <span class="text-xs text-on-surface-variant block">Ngày tạo đơn:</span>
            <span class="text-sm font-semibold text-on-surface">{{ formatDate(order.ngayTao) }}</span>
          </div>
        </div>

        <!-- Stepper Layout -->
        <div class="relative mt-10 mb-6">
          <!-- Active Line Background -->
          <div class="hidden md:block absolute top-[22px] left-[5%] right-[5%] h-1 bg-outline-variant/30 z-0"></div>
          
          <div class="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-0 relative z-10">
            <div 
              v-for="step in steps" 
              :key="step.status" 
              class="flex flex-row md:flex-col items-center gap-4 md:gap-2 text-center"
              :class="{
                'opacity-100': order.trangThai >= step.status && order.trangThai !== 5 && order.trangThai !== 6,
                'opacity-50': order.trangThai < step.status || order.trangThai === 5 || order.trangThai === 6
              }"
            >
              <!-- Step Icon Container -->
              <div 
                class="w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300"
                :class="{
                  'bg-primary text-on-primary border-primary shadow-lg shadow-primary/20': order.trangThai >= step.status && order.trangThai !== 5 && order.trangThai !== 6,
                  'bg-surface text-on-surface-variant border-outline-variant': order.trangThai < step.status || order.trangThai === 5 || order.trangThai === 6
                }"
              >
                <span class="material-symbols-outlined text-[20px]">{{ step.icon }}</span>
              </div>
              
              <!-- Step Label -->
              <div class="flex flex-col text-left md:text-center">
                <span 
                  class="text-sm font-semibold"
                  :class="{ 'text-primary font-bold': order.trangThai === step.status && order.trangThai !== 5 && order.trangThai !== 6 }"
                >
                  {{ step.label }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Custom Canceled Alert -->
        <div v-if="order.trangThai === 5" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800">
          <span class="material-symbols-outlined text-[28px] text-red-500">cancel</span>
          <div>
            <h4 class="font-bold">Đơn hàng này đã bị hủy</h4>
            <p class="text-xs mt-1" v-if="order.ghiChu">Lý do hủy: {{ order.ghiChu }}</p>
          </div>
        </div>

        <!-- Custom Delivery Failed Alert -->
        <div v-if="order.trangThai === 6" class="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800">
          <span class="material-symbols-outlined text-[28px] text-rose-500">cancel</span>
          <div>
            <h4 class="font-bold">Giao hàng không thành công</h4>
            <p class="text-xs mt-1" v-if="order.ghiChu">Chi tiết: {{ order.ghiChu }}</p>
          </div>
        </div>

        <!-- Cancellation Request Banner -->
        <div v-if="order.trangThaiYeuCauHuy === 1" class="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-amber-800">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[28px] text-amber-500 animate-pulse">hourglass_empty</span>
            <div>
              <h4 class="font-bold">Đang yêu cầu hủy đơn hàng</h4>
              <p class="text-xs mt-0.5">Chúng tôi đã tiếp nhận yêu cầu hủy và đang tiến hành xử lý.</p>
            </div>
          </div>
          <span class="bg-amber-100 text-amber-800 text-xs px-3 py-1.5 rounded-full font-bold uppercase">Chờ duyệt hủy</span>
        </div>

        <div v-if="order.trangThaiYeuCauHuy === 2" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800">
          <span class="material-symbols-outlined text-[28px] text-red-500">report</span>
          <div>
            <h4 class="font-bold">Yêu cầu hủy đơn bị từ chối</h4>
            <p class="text-xs mt-0.5">Yêu cầu hủy đơn hàng của bạn đã bị từ chối bởi nhân viên. Đơn hàng tiếp tục được xử lý bình thường.</p>
          </div>
        </div>
      </div>

      <!-- General Info Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Delivery info and cancel request -->
        <div class="lg:col-span-2 flex flex-col gap-6">
          <div class="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/30">
            <h4 class="text-label-md font-bold uppercase tracking-wider text-on-surface border-b border-outline-variant/30 pb-3 mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[20px]">person_pin_circle</span>
              Thông Tin Nhận Hàng
            </h4>
            <div class="flex flex-col gap-3 text-sm">
              <div class="flex"><span class="w-32 text-on-surface-variant font-medium">Người nhận:</span> <span class="font-bold text-on-surface">{{ order.tenKhachHang }}</span></div>
              <div class="flex"><span class="w-32 text-on-surface-variant font-medium">Số điện thoại:</span> <span class="font-semibold text-on-surface">{{ order.soDienThoai }}</span></div>
              <div class="flex"><span class="w-32 text-on-surface-variant font-medium">Email:</span> <span class="text-on-surface">{{ order.email }}</span></div>
              <div class="flex"><span class="w-32 text-on-surface-variant font-medium">Địa chỉ giao:</span> <span class="text-on-surface flex-1">{{ order.diaChi }}</span></div>
              <div class="flex" v-if="order.ghiChu"><span class="w-32 text-on-surface-variant font-medium">Ghi chú đơn:</span> <span class="text-on-surface italic flex-1">"{{ order.ghiChu }}"</span></div>
            </div>
          </div>

          <!-- Product Details Card -->
          <div class="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/30">
            <h4 class="text-label-md font-bold uppercase tracking-wider text-on-surface border-b border-outline-variant/30 pb-3 mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[20px]">local_mall</span>
              Danh Sách Sản Phẩm
            </h4>
            
            <div class="flex flex-col gap-4">
              <div 
                v-for="item in order.danhSachSanPham" 
                :key="item.id" 
                class="flex gap-4 border-b border-outline-variant/20 pb-4 last:border-b-0 last:pb-0"
              >
                <!-- Image placeholder / thumbnail -->
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
                    <h5 class="text-sm font-bold text-on-surface line-clamp-2">{{ item.tenSanPham }}</h5>
                    <p class="text-xs text-on-surface-variant mt-1">Phân loại: {{ item.tenMauSac }}, {{ item.tenKichCo }}</p>
                  </div>
                  <div class="flex justify-between items-center mt-2">
                    <span class="text-xs text-on-surface-variant">Số lượng: <span class="font-bold text-on-surface">{{ item.soLuong }}</span></span>
                    <span class="text-sm font-bold text-[#ef972d]">{{ formatCurrency(item.donGia) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar / Financial & Action -->
        <div class="flex flex-col gap-6">
          <!-- Billing Card -->
          <div class="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/30">
            <h4 class="text-label-md font-bold uppercase tracking-wider text-on-surface border-b border-outline-variant/30 pb-3 mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[20px]">receipt_long</span>
              Tổng Kết Tài Chính
            </h4>
            <div class="flex flex-col gap-3 text-sm border-b border-outline-variant/20 pb-4 mb-4 text-on-surface-variant">
              <div class="flex justify-between"><span>Tổng tiền hàng:</span> <span class="font-semibold text-on-surface">{{ formatCurrency(order.tongTienHang) }}</span></div>
              <div class="flex justify-between" v-if="order.giamGia > 0"><span>Giảm giá:</span> <span class="font-semibold text-red-500">-{{ formatCurrency(order.giamGia) }}</span></div>
              <div class="flex justify-between"><span>Phí vận chuyển:</span> <span class="font-semibold text-on-surface">{{ formatCurrency(order.phiVanChuyen) }}</span></div>
              <div class="flex justify-between">
                <span>Loại đơn hàng:</span> 
                <span class="font-bold text-on-surface">{{ getOrderTypeLabel(order) }}</span>
              </div>
              <div class="flex justify-between">
                <span>Phương thức thanh toán:</span> 
                <span class="font-bold text-on-surface">{{ getPaymentMethodLabel(order) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span>Trạng thái thanh toán:</span> 
                <span 
                  :class="isOrderPaid(order) ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-gray-500 bg-gray-50 border-gray-100'"
                  class="text-xs font-bold px-2 py-0.5 rounded border"
                >
                  {{ isOrderPaid(order) ? 'Đã thanh toán' : 'Chưa thanh toán' }}
                </span>
              </div>
            </div>
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm font-bold text-on-surface">Tổng thanh toán:</span>
              <span class="text-xl font-extrabold text-[#ef972d]">{{ formatCurrency(order.tongTien) }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-2">
            <!-- Allow cancellation if status is 0 (Chờ xác nhận) or 1 (Đã xác nhận) -->
            <template v-if="(order.trangThai === 0 || order.trangThai === 1) && !order.trangThaiYeuCauHuy">
              <button 
                @click="openCancelModal"
                class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all cursor-pointer shadow-md text-sm tracking-wider uppercase flex items-center justify-center gap-2"
              >
                <span class="material-symbols-outlined">cancel</span>
                <span>YÊU CẦU HỦY ĐƠN</span>
              </button>
            </template>
            <template v-else-if="order.trangThaiYeuCauHuy === 1">
              <button 
                disabled
                class="w-full bg-amber-500 text-white font-bold py-3 rounded-xl opacity-75 text-sm tracking-wider uppercase flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <span class="material-symbols-outlined animate-pulse">hourglass_empty</span>
                <span>Đang chờ duyệt hủy</span>
              </button>
            </template>
            <template v-else>
              <div class="text-xs text-center text-on-surface-variant p-4 bg-surface-container rounded-xl border border-outline-variant/30">
                Không thể yêu cầu hủy đơn hàng ở các trạng thái này (Chỉ khả dụng khi đơn đang chờ xác nhận hoặc đã xác nhận).
              </div>
            </template>
          </div>
        </div>

      </div>
    </div>

    <!-- Cancellation Dialog Modal -->
    <div 
      v-if="showCancelModal" 
      class="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
    >
      <div 
        class="bg-surface rounded-2xl shadow-2xl border border-outline-variant/30 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div class="px-6 py-4 bg-red-500 text-white flex justify-between items-center">
          <h3 class="font-bold text-lg flex items-center gap-2">
            <span class="material-symbols-outlined">report</span>
            Xác nhận hủy đơn hàng
          </h3>
          <button @click="closeCancelModal" class="text-white hover:opacity-80 transition-opacity">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div class="p-6">
          <p class="text-sm text-on-surface-variant mb-4">
            Vui lòng nhập lý do hủy đơn hàng. Yêu cầu của bạn sẽ được gửi tới nhân viên hỗ trợ của Bee Stylish để duyệt.
          </p>
          
          <textarea 
            v-model="cancelReason"
            placeholder="Lý do hủy đơn hàng..." 
            rows="4"
            class="w-full bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:outline-none focus:border-red-500 transition-colors placeholder:text-on-surface-variant/50"
            required
          ></textarea>

          <div v-if="cancelError" class="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200">
            {{ cancelError }}
          </div>
        </div>
        
        <div class="px-6 py-4 bg-surface-container border-t border-outline-variant/20 flex justify-end gap-3">
          <button 
            @click="closeCancelModal" 
            class="px-4 py-2 border border-outline-variant hover:bg-surface-container rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            :disabled="isCancelling"
          >
            Hủy bỏ
          </button>
          <button 
            @click="submitCancelRequest" 
            class="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2"
            :disabled="isCancelling"
          >
            <span v-if="isCancelling" class="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
            Gửi yêu cầu
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* Stepper animation or glass effect details */
.bg-surface-container-lowest {
  background-color: var(--md-sys-color-surface-container-lowest, #ffffff);
}
</style>

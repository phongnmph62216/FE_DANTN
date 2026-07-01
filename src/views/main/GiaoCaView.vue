<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

// UI States
const isLoading = ref(false)
const isSubmitting = ref(false)
const currentShift = ref(null)
const notes = ref('')
const keepForNextShift = ref(0)

// Toast alert state
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

// Bill counts for Polyme Denomination Calculator
const billCounts = ref({
  500000: 0,
  200000: 0,
  100000: 0,
  5000: 0,
  50000: 0,
  20000: 0,
  10000: 0,
  2000: 0,
  1000: 0
})

const billDenominations = [
  { label: '500,000 đ', value: 500000 },
  { label: '200,000 đ', value: 200000 },
  { label: '100,000 đ', value: 100000 },
  { label: '50,000 đ', value: 50000 },
  { label: '20,000 đ', value: 20000 },
  { label: '10,000 đ', value: 10000 },
  { label: '5,000 đ', value: 5000 },
  { label: '2,000 đ', value: 2000 },
  { label: '1,000 đ', value: 1000 }
]

// Fetch active shift details
const fetchData = async () => {
  isLoading.value = true
  try {
    const resShift = await api.get('/api/v1/giao-ca/current-status')
    if (resShift.data) {
      if (resShift.data.status === 'NOT_OPENED') {
        currentShift.value = null
      } else if (resShift.data.status === 'CLOSED') {
        const resDetail = await api.get(`/api/v1/giao-ca/${resShift.data.giaoCaId}`)
        if (resDetail.data) {
          currentShift.value = {
            ...resShift.data,
            ...resDetail.data,
            openTime: resDetail.data.thoiGianMoCa,
            closeTime: resDetail.data.thoiGianDongCa
          }
          keepForNextShift.value = resDetail.data.tienGiaoCaSau || 0
          notes.value = resDetail.data.ghiChu || ''
        } else {
          currentShift.value = resShift.data
          keepForNextShift.value = resShift.data.previousShiftCash || 0
        }
      } else {
        currentShift.value = resShift.data
        keepForNextShift.value = resShift.data.previousShiftCash || 0
      }
    }
  } catch (error) {
    console.error('Error fetching shift status:', error)
    showToast('Không thể tải thông tin ca trực.', 'error')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchData()
})

// Formatting Helpers
const formatCurrency = (val) => {
  if (val === null || val === undefined) return '0 đ'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
}

const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return ''
  const date = new Date(dateTimeStr)
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Computations
const theoreticalCash = computed(() => {
  if (!currentShift.value) return 0
  if (currentShift.value.status === 'CLOSED') {
    const startingCash = currentShift.value.tienMatDauCa || 0
    const cashRevenue = currentShift.value.tienMatThuTrongCa || 0
    const expenses = currentShift.value.tienMatChiRa || 0
    return startingCash + cashRevenue - expenses
  }
  const startingCash = currentShift.value.previousShiftCash || 0
  const cashRevenue = currentShift.value.tienMatThuTrongCa || 0
  const expenses = currentShift.value.tienMatChiRa || 0
  return startingCash + cashRevenue - expenses
})

const actualCash = computed(() => {
  if (currentShift.value && currentShift.value.status === 'CLOSED') {
    return currentShift.value.tienMatThucTeChotCa || 0
  }
  return Object.entries(billCounts.value).reduce((sum, [denom, qty]) => sum + Number(denom) * (qty || 0), 0)
})

const discrepancy = computed(() => {
  if (currentShift.value && currentShift.value.status === 'CLOSED') {
    return currentShift.value.tienChenhLech || 0
  }
  return actualCash.value - theoreticalCash.value
})

const amountToHandover = computed(() => {
  return Math.max(0, actualCash.value - keepForNextShift.value)
})

const isFormValid = computed(() => {
  // If there's a discrepancy, employee must explain why
  if (discrepancy.value !== 0 && !notes.value.trim()) {
    return false
  }
  return true
})

// Submit Shift Handover
const handleCloseShift = async () => {
  if (!currentShift.value) return
  if (!isFormValid.value) {
    showToast('Vui lòng hoàn thành tất cả thông tin bắt buộc (kèm lý do giải trình nếu lệch tiền).', 'warning')
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      idGiaoCa: currentShift.value.giaoCaId || currentShift.value.id || currentShift.value.scheduleId,
      tienMatThucTeChotCa: actualCash.value,
      tienChuyenKhoanTrongCa: currentShift.value.tienChuyenKhoanTrongCa || 0,
      tienChenhLech: discrepancy.value,
      tienGiaoCaSau: keepForNextShift.value,
      ghiChu: notes.value
    }

    await api.post('/api/v1/giao-ca/chot-ca', payload)
    showToast('Chốt ca thành công!', 'success')
    
    setTimeout(() => {
      router.push('/admin')
    }, 1500)
  } catch (error) {
    console.error('Error closing shift:', error)
    showToast(error.response?.data?.message || 'Giao dịch thất bại. Vui lòng kiểm tra lại.', 'error')
  } finally {
    isSubmitting.value = false
  }
}

// Reset calculator values
const resetCalculator = () => {
  Object.keys(billCounts.value).forEach(key => {
    billCounts.value[key] = 0
  })
}
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-headline-md text-headline-md text-inverse-surface mb-1 font-bold uppercase text-[#EF972D]">
          BÀN GIAO CA LÀM VIỆC
        </h1>
        <p class="text-sm text-gray-500">Thực hiện chốt doanh số tiền mặt, đối soát két và bàn giao ca trực cho đồng nghiệp.</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="p-12 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-150 min-h-[400px]">
      <div class="w-8 h-8 border-4 border-[#EF972D] border-t-transparent rounded-full animate-spin"></div>
      <span class="text-sm font-semibold text-gray-600">Đang tải thông tin ca trực của bạn...</span>
    </div>

    <!-- No Active Shift State -->
    <div v-else-if="!currentShift" class="p-12 text-center flex flex-col items-center justify-center gap-4 bg-white rounded-2xl border border-gray-150 min-h-[350px]">
      <span class="material-symbols-outlined text-[#EF972D] text-6xl">schedule_send</span>
      <h2 class="text-xl font-bold text-gray-800">Không có ca làm việc nào đang chạy!</h2>
      <p class="text-sm text-gray-500 max-w-md">Bạn hiện chưa mở ca làm việc của ngày hôm nay. Hãy quay lại trang chủ để thực hiện mở ca trước khi làm việc.</p>
      <button 
        @click="router.push('/admin')"
        class="px-6 py-2.5 bg-[#EF972D] hover:bg-[#D87D15] text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
      >
        <span class="material-symbols-outlined text-[18px]">home</span>
        Về trang chủ mở ca
      </button>
    </div>

    <!-- Shift Closure Layout -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      <!-- LEFT COLUMN: Shift Info & Financial Summary -->
      <div class="lg:col-span-5 space-y-6">
        
        <!-- Active Shift Detail Card -->
        <div 
          :class="currentShift.status === 'CLOSED' ? 'bg-gradient-to-br from-slate-500 to-slate-600 border-slate-600/10' : 'bg-gradient-to-br from-[#EF972D] to-[#D87D15] border-[#D87D15]/10'"
          class="text-white rounded-2xl p-6 shadow-lg border"
        >
          <div class="flex items-center justify-between mb-4">
            <span class="px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">Ca Trực Hiện Tại</span>
            <div 
              v-if="currentShift.status === 'CLOSED'" 
              class="flex items-center gap-1.5 text-xs text-slate-200 font-semibold"
            >
              <span class="w-2.5 h-2.5 bg-slate-300 rounded-full"></span>
              Đã chốt & bàn giao
            </div>
            <div 
              v-else 
              class="flex items-center gap-1.5 text-xs text-green-300 font-semibold animate-pulse"
            >
              <span class="w-2.5 h-2.5 bg-green-400 rounded-full"></span>
              Đang hoạt động
            </div>
          </div>

          <div class="space-y-4">
            <div>
              <span class="text-xs text-white/60 uppercase font-bold tracking-wider">Nhân viên trực</span>
              <h3 class="text-lg font-bold">{{ currentShift.employeeName }}</h3>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <span class="text-xs text-white/60 uppercase font-bold tracking-wider">Ca phân công</span>
                <p class="text-sm font-semibold">{{ currentShift.shiftName || 'Ca làm việc' }}</p>
              </div>
              <div v-if="currentShift.status === 'CLOSED'">
                <span class="text-xs text-white/60 uppercase font-bold tracking-wider">Đã chốt ca lúc</span>
                <p class="text-xs font-semibold">{{ formatDateTime(currentShift.closeTime) || '—' }}</p>
              </div>
              <div v-else>
                <span class="text-xs text-white/60 uppercase font-bold tracking-wider">Mở ca lúc</span>
                <p class="text-xs font-semibold">{{ formatDateTime(currentShift.openTime) || 'Vừa xong' }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Financial Summary Card -->
        <div class="bg-white rounded-2xl p-6 shadow-xl border border-gray-150 space-y-4">
          <h3 class="font-bold text-[#0D2533] border-b border-gray-100 pb-3 flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-[#EF972D]">analytics</span>
            Đối Soát Dòng Tiền Lý Thuyết
          </h3>

          <div class="space-y-3.5 text-sm">
            <div class="flex justify-between items-center py-1">
              <span class="text-gray-500">Tiền mặt bàn giao đầu ca:</span>
              <span class="font-bold text-gray-800">{{ formatCurrency(currentShift.previousShiftCash) }}</span>
            </div>
            
            <div class="flex justify-between items-center py-1">
              <span class="text-gray-500">Doanh thu bán tiền mặt (POS):</span>
              <span class="font-bold text-green-600">+ {{ formatCurrency(currentShift.tienMatThuTrongCa || 0) }}</span>
            </div>

            <div class="flex justify-between items-center py-1">
              <span class="text-gray-500">Tiền mặt chi ra / Hoàn trả:</span>
              <span class="font-bold text-red-500">- {{ formatCurrency(currentShift.tienMatChiRa || 0) }}</span>
            </div>

            <div class="h-px bg-gray-100 my-1"></div>

            <div class="flex justify-between items-center py-2 bg-gray-50 px-3.5 rounded-xl border border-gray-100 font-bold">
              <span class="text-gray-700">Tiền lý thuyết trong két:</span>
              <span class="text-lg text-gray-900">{{ formatCurrency(theoreticalCash) }}</span>
            </div>

            <div class="h-px bg-gray-100 my-1"></div>

            <div class="flex justify-between items-center py-1">
              <span class="text-gray-500">Doanh thu Chuyển khoản / QR:</span>
              <span class="font-bold text-blue-600">{{ formatCurrency(currentShift.tienChuyenKhoanTrongCa || 0) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN: Polyme Calculator & Verification -->
      <div class="lg:col-span-7 space-y-6">
        
        <!-- Denomination Calculator -->
        <div class="bg-white rounded-2xl p-6 shadow-xl border border-gray-150 space-y-4">
          <div class="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 class="font-bold text-[#0D2533] flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px] text-[#EF972D]">calculate</span>
              Bảng Đếm Tiền Mặt Thực Tế
            </h3>
            <button 
              v-if="currentShift.status !== 'CLOSED'"
              @click="resetCalculator"
              class="text-xs text-red-500 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer font-bold"
            >
              <span class="material-symbols-outlined text-[14px]">restart_alt</span>
              Đặt lại đếm
            </button>
          </div>

          <!-- Polyme Denominations Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              v-for="denom in billDenominations" 
              :key="denom.value"
              class="flex items-center justify-between bg-gray-50/50 hover:bg-gray-50 p-2.5 rounded-xl border border-gray-100 transition-colors"
            >
              <span class="text-xs font-bold text-gray-600 w-24">{{ denom.label }}</span>
              <div class="flex items-center gap-2">
                <span class="text-[11px] text-gray-400 font-semibold">x</span>
                <input 
                  type="number"
                  v-model.number="billCounts[denom.value]"
                  min="0"
                  placeholder="0"
                  :disabled="currentShift.status === 'CLOSED'"
                  class="w-16 px-2 py-1 border border-gray-200 focus:border-[#EF972D] rounded-lg outline-none text-center text-xs font-bold bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                />
                <span class="text-[10px] text-gray-400 w-16 text-right font-medium">
                  = {{ formatCurrency((billCounts[denom.value] || 0) * denom.value) }}
                </span>
              </div>
            </div>
          </div>

          <div class="bg-[#EF972D]/5 border border-[#EF972D]/10 rounded-2xl p-4 flex justify-between items-center mt-4">
            <div class="space-y-0.5">
              <span class="text-xs font-bold text-gray-500 uppercase tracking-wider block">Tổng tiền mặt đếm được</span>
              <span class="text-sm text-gray-400 italic">Tổng từ bảng đếm trên</span>
            </div>
            <span class="text-2xl font-black text-[#EF972D]">{{ formatCurrency(actualCash) }}</span>
          </div>
        </div>

        <!-- Handover & Verification Form -->
        <div class="bg-white rounded-2xl p-6 shadow-xl border border-gray-150 space-y-5">
          <h3 class="font-bold text-[#0D2533] border-b border-gray-100 pb-3 flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-[#EF972D]">lock</span>
            Xác Nhận & Ký Bàn Giao
          </h3>

          <!-- Discrepancy Card -->
          <div 
            class="p-4 rounded-2xl border flex items-center justify-between transition-all"
            :class="discrepancy === 0 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
              : discrepancy > 0 
                ? 'bg-amber-50 border-amber-100 text-amber-800' 
                : 'bg-red-50 border-red-100 text-red-800'"
          >
            <div>
              <span class="text-xs font-bold uppercase tracking-wider block">Chênh lệch két tiền mặt</span>
              <span class="text-xs opacity-75">
                {{ discrepancy === 0 ? 'Két khớp hoàn toàn' : discrepancy > 0 ? 'Thừa tiền mặt so với sổ sách' : 'Thiếu hụt tiền mặt so với sổ sách' }}
              </span>
            </div>
            <span class="text-lg font-black">
              {{ discrepancy > 0 ? '+' : '' }}{{ formatCurrency(discrepancy) }}
            </span>
          </div>

          <!-- Discrepancy explanation -->
          <div v-if="discrepancy !== 0" class="space-y-1.5">
            <label class="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
              <span>Giải trình chênh lệch *</span>
              <span v-if="currentShift.status !== 'CLOSED'" class="text-[10px] lowercase italic font-normal text-gray-400">(Bắt buộc giải trình khi lệch tiền)</span>
            </label>
            <textarea 
              v-model="notes"
              rows="2.5"
              placeholder="Nhập lý do chênh lệch tiền mặt tại đây..."
              :disabled="currentShift.status === 'CLOSED'"
              class="w-full px-4 py-3 bg-white border border-gray-200 focus:border-red-400 rounded-xl outline-none text-sm transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
            ></textarea>
          </div>
          <div v-else class="space-y-1.5">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider block">Ghi chú bàn giao ca</label>
            <textarea 
              v-model="notes"
              rows="2"
              placeholder="Nhập thông tin bàn giao công việc cần lưu ý cho ca sau..."
              :disabled="currentShift.status === 'CLOSED'"
              class="w-full px-4 py-3 bg-white border border-gray-200 focus:border-[#EF972D] rounded-xl outline-none text-sm transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
            ></textarea>
          </div>

          <!-- Leave for next shift vs Deposit -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider block">Để lại ca sau thối tiền (Tiền cốp)</label>
              <div class="relative flex items-center">
                <input 
                  type="number"
                  v-model.number="keepForNextShift"
                  disabled
                  class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-bold text-gray-500 cursor-not-allowed pr-12"
                />
                <span class="absolute right-4 text-xs font-bold text-gray-400">VND</span>
              </div>
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider block">Nộp lại quản lý / két sắt</label>
              <div class="relative flex items-center">
                <input 
                  type="text"
                  disabled
                  :value="formatCurrency(amountToHandover)"
                  class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <button 
            v-if="currentShift.status !== 'CLOSED'"
            @click="handleCloseShift"
            :disabled="isSubmitting || !isFormValid"
            class="w-full py-3.5 bg-[#EF972D] hover:bg-[#D87D15] disabled:bg-[#EF972D]/50 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all text-center cursor-pointer flex items-center justify-center gap-2"
          >
            <span v-if="isSubmitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span class="material-symbols-outlined text-[18px]">verified</span>
            Xác nhận Chốt ca & Bàn giao
          </button>
          <div 
            v-else
            class="w-full py-3.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2"
          >
            <span class="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
            Ca trực này đã được chốt và bàn giao thành công
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Toast Alert -->
  <div 
    v-if="toast.show" 
    class="fixed bottom-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border transition-all duration-300 transform translate-y-0"
    :class="{
      'bg-emerald-50 border-emerald-200 text-emerald-800': toast.type === 'success',
      'bg-red-50 border-red-200 text-red-800': toast.type === 'error',
      'bg-blue-50 border-blue-200 text-blue-800': toast.type === 'info',
      'bg-amber-50 border-amber-200 text-amber-800': toast.type === 'warning'
    }"
  >
    <span class="material-symbols-outlined text-lg">
      {{ toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : toast.type === 'warning' ? 'warning' : 'info' }}
    </span>
    <span class="text-sm font-semibold font-body-md">{{ toast.message }}</span>
    <button @click="toast.show = false" class="ml-4 text-gray-400 hover:text-gray-600 cursor-pointer">
      <span class="material-symbols-outlined text-sm">close</span>
    </button>
  </div>
</template>

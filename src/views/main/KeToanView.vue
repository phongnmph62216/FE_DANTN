<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { formatCurrency, formatDate } from '@/utils/format'

const authStore = useAuthStore()

// States
const logs = ref([])
const loading = ref(false)
const fromDate = ref('')
const toDate = ref('')
const filterStatus = ref('all') // 'all', 'pending', 'approved', 'discrepancy'

// Detail modal state
const showDetailModal = ref(false)
const selectedLog = ref(null)

// Toast alerts
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

// Fetch logs
const fetchLogs = async () => {
  loading.value = true
  try {
    const res = await api.get('/api/v1/giao-ca', {
      params: {
        fromDate: fromDate.value,
        toDate: toDate.value
      }
    })
    
    // Filter to only show current employee's shifts (if the backend returns all shifts)
    let data = res.data || []
    if (authStore.isEmployee && authStore.user?.hoTen) {
      data = data.filter(log => log.tenNhanVienNhanCa === authStore.user.hoTen)
    }
    
    logs.value = data.sort((a, b) => b.id - a.id)
  } catch (error) {
    console.error('Error fetching accounting logs:', error)
    showToast('Lỗi khi tải lịch sử đối soát ca của bạn.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchLogs()
})

const handleResetFilters = () => {
  fromDate.value = ''
  toDate.value = ''
  filterStatus.value = 'all'
  fetchLogs()
}

// Computed Statistics
const totalShifts = computed(() => logs.value.length)

const totalCashRevenue = computed(() => {
  return logs.value.reduce((sum, item) => sum + (item.tienMatThuTrongCa || 0), 0)
})

const totalBankRevenue = computed(() => {
  return logs.value.reduce((sum, item) => sum + (item.tienChuyenKhoanTrongCa || 0), 0)
})

const totalDiscrepancies = computed(() => {
  return logs.value.reduce((sum, item) => sum + (item.tienChenhLech || 0), 0)
})

const filteredLogs = computed(() => {
  let list = logs.value
  if (filterStatus.value === 'pending') {
    list = list.filter(log => log.trangThai === 1 && !log.trangThaiDoiSoat) // Closed but not audited
  } else if (filterStatus.value === 'approved') {
    list = list.filter(log => log.trangThaiDoiSoat === 1) // Approved
  } else if (filterStatus.value === 'discrepancy') {
    list = list.filter(log => log.tienChenhLech !== 0) // Discrepancies
  }
  return list
})

// Formatters
const formatDiff = (val) => {
  if (val === null || val === undefined) return '0 đ'
  const prefix = val > 0 ? '+' : ''
  return prefix + formatCurrency(val)
}

const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return { time: '---', day: '' }
  const date = new Date(dateTimeStr)
  if (isNaN(date.getTime())) return { time: dateTimeStr, day: '' }
  const pad = (n) => String(n).padStart(2, '0')
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  const day = formatDate(dateTimeStr)
  return { time, day }
}

const openDetailModal = (log) => {
  selectedLog.value = log
  showDetailModal.value = true
}

const closeDetailModal = () => {
  selectedLog.value = null
  showDetailModal.value = false
}
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-headline-md text-headline-md text-inverse-surface mb-1 font-bold uppercase text-[#EF972D]">
          ĐỐI SOÁT & KẾ TOÁN CỦA TÔI
        </h1>
        <p class="text-sm text-gray-500">Xem và kiểm tra lịch sử dòng tiền, doanh số và tình trạng đối soát ca trực cá nhân.</p>
      </div>
    </div>

    <!-- Quick Statistics Banner -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
      <!-- Total Shifts -->
      <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-150 flex items-center gap-4">
        <div class="p-3 bg-orange-50 text-[#EF972D] rounded-xl flex items-center justify-center">
          <span class="material-symbols-outlined text-2xl">schedule</span>
        </div>
        <div>
          <span class="text-xs font-semibold text-gray-400 block uppercase">Số ca đã làm</span>
          <span class="text-xl font-bold text-gray-800">{{ totalShifts }} ca</span>
        </div>
      </div>

      <!-- Cash Sales -->
      <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-150 flex items-center gap-4">
        <div class="p-3 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
          <span class="material-symbols-outlined text-2xl">payments</span>
        </div>
        <div>
          <span class="text-xs font-semibold text-gray-400 block uppercase">Doanh thu tiền mặt</span>
          <span class="text-xl font-bold text-emerald-600">{{ formatCurrency(totalCashRevenue) }}</span>
        </div>
      </div>

      <!-- Bank/QR Sales -->
      <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-150 flex items-center gap-4">
        <div class="p-3 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
          <span class="material-symbols-outlined text-2xl">qr_code_2</span>
        </div>
        <div>
          <span class="text-xs font-semibold text-gray-400 block uppercase">Chuyển khoản / QR</span>
          <span class="text-xl font-bold text-blue-600">{{ formatCurrency(totalBankRevenue) }}</span>
        </div>
      </div>

      <!-- Total Discrepancies -->
      <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-150 flex items-center gap-4">
        <div class="p-3 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
          <span class="material-symbols-outlined text-2xl">error_outline</span>
        </div>
        <div>
          <span class="text-xs font-semibold text-gray-400 block uppercase">Tổng chênh lệch két</span>
          <span class="text-xl font-bold" :class="totalDiscrepancies >= 0 ? 'text-green-600' : 'text-red-500'">
            {{ formatDiff(totalDiscrepancies) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Filters Section -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-150 p-5">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <!-- Date Filters -->
        <div class="flex flex-col gap-1 w-full">
          <label class="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Từ ngày</label>
          <input 
            v-model="fromDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#EF972D] focus:border-[#EF972D] text-sm cursor-pointer transition-all"
            @change="fetchLogs"
          />
        </div>

        <div class="flex flex-col gap-1 w-full">
          <label class="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Đến ngày</label>
          <input 
            v-model="toDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#EF972D] focus:border-[#EF972D] text-sm cursor-pointer transition-all"
            @change="fetchLogs"
          />
        </div>

        <!-- Audit Status Filter -->
        <div class="flex flex-col gap-1 w-full">
          <label class="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Trạng thái đối soát</label>
          <div class="relative">
            <select 
              v-model="filterStatus"
              class="w-full appearance-none border border-gray-200 rounded-xl bg-white py-2 pl-3 pr-10 focus:outline-none focus:ring-1 focus:ring-[#EF972D] focus:border-[#EF972D] text-sm cursor-pointer transition-all"
            >
              <option value="all">Tất cả ca</option>
              <option value="pending">Chờ đối soát</option>
              <option value="approved">Đã đối soát</option>
              <option value="discrepancy">Ca lệch tiền</option>
            </select>
            <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" style="font-size: 18px;">expand_more</span>
          </div>
        </div>

        <!-- Clear Filter button -->
        <div>
          <button 
            @click="handleResetFilters"
            class="w-full py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:border-[#EF972D]"
          >
            <span class="material-symbols-outlined text-[16px]">restart_alt</span>
            Đặt lại bộ lọc
          </button>
        </div>
      </div>
    </div>

    <!-- Data Table -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-150 overflow-hidden min-h-[300px] flex flex-col">
      <div class="overflow-x-auto flex-1">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 text-[#0D2533] uppercase text-xs font-bold border-b border-gray-100">
              <th class="py-4 px-6 text-center w-16">STT</th>
              <th class="py-4 px-6 w-32 text-center">Ngày trực</th>
              <th class="py-4 px-6">Ca trực</th>
              <th class="py-4 px-6">Thời gian làm việc</th>
              <th class="py-4 px-6">Doanh số tiền mặt</th>
              <th class="py-4 px-6">Tổng chênh lệch</th>
              <th class="py-4 px-6 text-center w-40">Kế toán duyệt</th>
              <th class="py-4 px-6 text-center w-24">Chi tiết</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 text-sm">
            <tr v-if="loading" class="text-center">
              <td colspan="8" class="py-12 text-gray-400">
                <div class="flex items-center justify-center gap-2">
                  <div class="w-5 h-5 border-2 border-[#EF972D] border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang tải lịch sử đối soát...</span>
                </div>
              </td>
            </tr>
            <tr v-else-if="filteredLogs.length === 0" class="text-center">
              <td colspan="8" class="py-12 text-gray-400 font-bold">Không tìm thấy ca trực nào của bạn.</td>
            </tr>
            <tr v-else v-for="(log, index) in filteredLogs" :key="log.id" class="hover:bg-gray-50/50 transition-colors">
              <!-- STT -->
              <td class="py-4 px-6 text-center font-medium text-gray-500">{{ index + 1 }}</td>

              <!-- NGÀY -->
              <td class="py-4 px-6 text-center font-semibold text-gray-700 whitespace-nowrap">
                {{ formatDateTime(log.thoiGianMoCa).day }}
              </td>

              <!-- CA TRỰC -->
              <td class="py-4 px-6">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#EF972D]/10 text-[#EF972D]">
                  {{ log.tenCa || 'Ca làm việc' }}
                </span>
              </td>

              <!-- THỜI GIAN -->
              <td class="py-4 px-6 text-xs text-gray-500 font-medium">
                <div class="flex items-center gap-1">
                  <span class="text-gray-400 w-8">Vào:</span>
                  <span>{{ formatDateTime(log.thoiGianMoCa).time }}</span>
                </div>
                <div class="flex items-center gap-1 mt-1" v-if="log.thoiGianDongCa">
                  <span class="text-gray-400 w-8">Ra:</span>
                  <span>{{ formatDateTime(log.thoiGianDongCa).time }}</span>
                </div>
                <div class="flex items-center gap-1 mt-1" v-else>
                  <span class="text-gray-400 w-8">Ra:</span>
                  <span class="text-green-500 font-bold">Đang làm việc</span>
                </div>
              </td>

              <!-- DOANH SỐ TIỀN MẶT -->
              <td class="py-4 px-6 font-bold text-gray-700">
                {{ formatCurrency(log.tienMatThuTrongCa) }}
              </td>

              <!-- CHÊNH LỆCH -->
              <td class="py-4 px-6 font-bold" :class="log.tienChenhLech === 0 ? 'text-gray-400' : log.tienChenhLech > 0 ? 'text-green-600' : 'text-red-500'">
                {{ formatDiff(log.tienChenhLech) }}
              </td>

              <!-- TRẠNG THÁI DUYỆT -->
              <td class="py-4 px-6 text-center">
                <span 
                  v-if="log.trangThai === 0"
                  class="px-3 py-1 text-xs font-bold rounded-full bg-green-50 text-green-600 border border-green-100"
                >
                  Đang làm việc
                </span>
                <span 
                  v-else-if="!log.trangThaiDoiSoat"
                  class="px-3 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-600 border border-amber-100"
                >
                  Chờ đối soát
                </span>
                <span 
                  v-else-if="log.trangThaiDoiSoat === 1"
                  class="px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100"
                >
                  Đã đối soát
                </span>
                <span 
                  v-else
                  class="px-3 py-1 text-xs font-bold rounded-full bg-red-50 text-red-500 border border-red-100"
                >
                  Sai lệch - Đã xử lý
                </span>
              </td>

              <!-- CHI TIẾT -->
              <td class="py-4 px-6 text-center">
                <button 
                  @click="openDetailModal(log)" 
                  class="p-2 text-gray-400 hover:text-[#EF972D] hover:bg-orange-50 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-orange-100"
                >
                  <span class="material-symbols-outlined text-[18px]">visibility</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Personal Shift Detail Modal -->
    <div 
      v-if="showDetailModal && selectedLog" 
      class="fixed inset-0 bg-[#0D2533]/40 flex items-center justify-center z-50 p-4 transition-all"
    >
      <div class="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
        <!-- Modal Header -->
        <div class="p-5 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-[#EF972D] to-[#D87D15] text-white">
          <h3 class="text-base font-bold flex items-center gap-2">
            <span class="material-symbols-outlined">payments</span>
            Chi Tiết Ca Làm Việc & Đối Soát
          </h3>
          <button 
            @click="closeDetailModal" 
            class="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          <!-- General shift details -->
          <div class="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs">
            <div>
              <span class="text-gray-400 block font-semibold uppercase">Ca trực</span>
              <span class="text-sm font-bold text-gray-800">{{ selectedLog.tenCa || 'Ca làm việc' }}</span>
            </div>
            <div>
              <span class="text-gray-400 block font-semibold uppercase">Bắt đầu trực</span>
              <span class="text-sm font-medium text-gray-600 flex items-center gap-1 mt-0.5">
                <span class="material-symbols-outlined text-xs">schedule</span>
                {{ formatDateTime(selectedLog.thoiGianMoCa).time }} {{ formatDateTime(selectedLog.thoiGianMoCa).day }}
              </span>
            </div>
            <div class="mt-2">
              <span class="text-gray-400 block font-semibold uppercase">Kết thúc trực</span>
              <span class="text-sm font-medium text-gray-600 flex items-center gap-1 mt-0.5">
                <span class="material-symbols-outlined text-xs">schedule</span>
                {{ selectedLog.thoiGianDongCa 
                  ? `${formatDateTime(selectedLog.thoiGianDongCa).time} ${formatDateTime(selectedLog.thoiGianDongCa).day}` 
                  : 'Đang mở' }}
              </span>
            </div>
            <div class="mt-2">
              <span class="text-gray-400 block font-semibold uppercase">Người đồng kiểm ca</span>
              <span class="text-sm font-bold text-gray-700 mt-0.5">
                {{ selectedLog.tenNguoiDongCa || 'Hệ thống tự động' }}
              </span>
            </div>
          </div>

          <!-- Cash funds details -->
          <div class="space-y-3">
            <h4 class="text-sm font-bold text-[#0D2533] border-b border-gray-100 pb-1.5 flex items-center gap-1">
              <span class="material-symbols-outlined text-sm text-[#EF972D]">point_of_sale</span>
              Két Tiền Mặt Tại Quầy
            </h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between items-center text-gray-600">
                <span>Tiền mặt đầu ca (nhận giao ca):</span>
                <span class="font-semibold">{{ formatCurrency(selectedLog.tienMatDauCa) }}</span>
              </div>
              <div class="flex justify-between items-center text-gray-600">
                <span>Doanh thu tiền mặt bán hàng:</span>
                <span class="font-semibold">{{ formatCurrency(selectedLog.tienMatThuTrongCa) }}</span>
              </div>
              <div class="flex justify-between items-center text-gray-600">
                <span>Tiền chi ra trong ca:</span>
                <span class="font-semibold">{{ formatCurrency(selectedLog.tienMatChiRa || 0) }}</span>
              </div>
              <div class="flex justify-between items-center py-1.5 border-y border-gray-100 bg-gray-50/50 px-2 rounded font-bold text-gray-700">
                <span>Tiền lý thuyết phải có:</span>
                <span>{{ formatCurrency((selectedLog.tienMatDauCa || 0) + (selectedLog.tienMatThuTrongCa || 0) - (selectedLog.tienMatChiRa || 0)) }}</span>
              </div>
              <div class="flex justify-between items-center py-1 font-bold text-[#0D2533]">
                <span>Tiền mặt thực tế đếm & nộp:</span>
                <span class="text-base text-[#EF972D]">{{ formatCurrency(selectedLog.tienMatThucTeChotCa) }}</span>
              </div>
            </div>
          </div>

          <!-- Discrepancy & Audit resolution -->
          <div 
            class="p-4 rounded-xl border space-y-2"
            :class="selectedLog.tienChenhLech === 0 
              ? 'bg-emerald-50/30 border-emerald-100/50 text-emerald-800' 
              : 'bg-red-50/30 border-red-100/50 text-red-800'"
          >
            <div class="flex justify-between items-center font-bold">
              <span class="text-xs uppercase tracking-wider block">Chênh lệch két chốt ca</span>
              <span class="text-sm font-black">{{ formatDiff(selectedLog.tienChenhLech) }}</span>
            </div>
            
            <div v-if="selectedLog.tienChenhLech !== 0 && selectedLog.ghiChu" class="text-xs">
              <span class="font-bold text-gray-500 block mb-0.5">Lý do giải trình chênh lệch:</span>
              <p class="text-gray-700 italic bg-white p-2 rounded-lg border border-gray-100">{{ selectedLog.ghiChu }}</p>
            </div>

            <!-- Manager audit comments if audited -->
            <div v-if="selectedLog.trangThaiDoiSoat" class="text-xs pt-2 border-t border-gray-150/50 mt-2 space-y-1.5">
              <div class="flex justify-between items-center font-bold">
                <span class="text-gray-500 uppercase tracking-wider">Kế toán đối soát xử lý</span>
                <span class="px-2 py-0.5 rounded text-[10px]" :class="selectedLog.trangThaiDoiSoat === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'">
                  {{ selectedLog.trangThaiDoiSoat === 1 ? 'Đã duyệt khớp' : 'Đã xử lý phạt' }}
                </span>
              </div>
              <div v-if="selectedLog.phuongAnXuLy" class="flex justify-between items-center text-gray-700">
                <span>Phương án xử lý:</span>
                <span class="font-bold">
                  {{ selectedLog.phuongAnXuLy === 'TRU_LUONG' ? 'Khấu trừ vào lương trực ca' : selectedLog.phuongAnXuLy === 'CHI_PHI_CUA_HANG' ? 'Hạch toán bù lỗ cửa hàng' : 'Bỏ qua / Không xử lý' }}
                </span>
              </div>
              <div v-if="selectedLog.ghiChuDoiSoat" class="text-gray-700">
                <span class="font-semibold block text-[10px] text-gray-500 uppercase mt-1">Ý kiến kế toán:</span>
                <p class="italic bg-white p-2 rounded-lg border border-gray-100 text-gray-700">{{ selectedLog.ghiChuDoiSoat }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button 
            @click="closeDetailModal" 
            class="px-5 py-2.5 bg-gradient-to-r from-[#EF972D] to-[#D87D15] text-white rounded-xl shadow-md hover:shadow-lg font-bold text-xs transition-all cursor-pointer"
          >
            Đóng lại
          </button>
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

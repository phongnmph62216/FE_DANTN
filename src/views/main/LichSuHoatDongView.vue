<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '@/services/api'
import { formatCurrency as utilsFormatCurrency } from '@/utils/format'

// Toast notification alert state
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

// States
const activityLogs = ref([])
const loading = ref(false)
const isAuditing = ref(false)

// Filter states
const searchKeyword = ref('')
const fromDate = ref('')
const toDate = ref('')
const filterStatus = ref('all') // 'all', 'pending', 'approved', 'discrepancy'

// Audit Form States
const auditAction = ref('TRU_LUONG') // 'TRU_LUONG', 'CHI_PHI_CUA_HANG', 'KHONG_XU_LY'
const auditNotes = ref('')

const fetchActivityLogs = async () => {
  loading.value = true
  try {
    const res = await api.get('/api/v1/giao-ca', {
      params: {
        keyword: searchKeyword.value,
        fromDate: fromDate.value,
        toDate: toDate.value
      }
    })
    activityLogs.value = (res.data || []).sort((a, b) => b.id - a.id)
  } catch (error) {
    console.error('Error fetching activity logs:', error)
  } finally {
    loading.value = false
  }
}

// Client-side filtering computed property
const filteredLogs = computed(() => {
  let list = activityLogs.value
  if (filterStatus.value === 'pending') {
    list = list.filter(log => log.trangThai === 1 && !log.trangThaiDoiSoat) // Closed but not audited
  } else if (filterStatus.value === 'approved') {
    list = list.filter(log => log.trangThaiDoiSoat === 1) // Approved
  } else if (filterStatus.value === 'discrepancy') {
    list = list.filter(log => log.tienChenhLech !== 0) // Discrepancies
  }
  return list
})

const handleResetFilters = () => {
  searchKeyword.value = ''
  fromDate.value = ''
  toDate.value = ''
  filterStatus.value = 'all'
  fetchActivityLogs()
}

const handleApproveAudit = async (log) => {
  if (!log) return
  isAuditing.value = true
  try {
    const payload = {
      trangThaiDoiSoat: 1, // 1: Approved / Audited
      phuongAnXuLy: log.tienChenhLech !== 0 ? auditAction.value : 'KHONG_XU_LY',
      ghiChuDoiSoat: auditNotes.value
    }
    
    await api.put(`/api/v1/giao-ca/doi-soat/${log.id}`, payload)
    showToast('Đối soát và duyệt ca trực thành công!', 'success')
    
    // Reset audit inputs
    auditNotes.value = ''
    
    // Refresh list and close modal
    await fetchActivityLogs()
    closeDetailsModal()
  } catch (error) {
    console.error('Error auditing shift:', error)
    showToast(error.response?.data?.message || 'Có lỗi xảy ra khi đối soát ca trực.', 'error')
  } finally {
    isAuditing.value = false
  }
}

onMounted(() => {
  fetchActivityLogs()
})

// Details Modal State
const showDetailsModal = ref(false)
const selectedLog = ref(null)
const selectedLogVouchers = ref([])

const fetchSelectedLogVouchers = async (logId) => {
  try {
    const res = await api.get(`/api/v1/giao-ca/phieu-chi/${logId}`)
    selectedLogVouchers.value = res.data || []
  } catch (error) {
    console.error('Error fetching vouchers for log:', error)
  }
}

const openDetailsModal = (log) => {
  selectedLog.value = log
  selectedLogVouchers.value = []
  if (log && log.id) {
    fetchSelectedLogVouchers(log.id)
  }
  // Pre-fill audit notes/action if already audited
  if (log.trangThaiDoiSoat) {
    auditAction.value = log.phuongAnXuLy || 'KHONG_XU_LY'
    auditNotes.value = log.ghiChuDoiSoat || ''
  } else {
    auditAction.value = log.tienChenhLech !== 0 ? 'TRU_LUONG' : 'KHONG_XU_LY'
    auditNotes.value = ''
  }
  showDetailsModal.value = true
}

const closeDetailsModal = () => {
  selectedLog.value = null
  selectedLogVouchers.value = []
  showDetailsModal.value = false
}

// Formatters
const formatCurrency = (val) => {
  return utilsFormatCurrency(val)
}

const formatDiff = (val) => {
  if (val === null || val === undefined) return '0 đ'
  const prefix = val > 0 ? '+' : ''
  return prefix + utilsFormatCurrency(val)
}

const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return { time: '---', day: '' }
  const date = new Date(dateTimeStr)
  if (isNaN(date.getTime())) return { time: dateTimeStr, day: '' }
  const pad = (n) => String(n).padStart(2, '0')
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  const day = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
  return { time, day }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header Page -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-[#0D2533]">Lịch Sử Hoạt Động & Giao Ca</h2>
        <p class="text-sm text-gray-500">Xem và đối soát thông tin cốp ca, doanh thu tiền mặt và chuyển khoản.</p>
      </div>
    </div>

    <!-- Filters Area -->
    <div class="bg-white rounded-2xl shadow-xl border border-gray-150 p-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <!-- Search Keyword -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Tìm kiếm</label>
          <div class="relative flex items-center">
            <span class="material-symbols-outlined absolute left-3 text-gray-400 text-lg">search</span>
            <input 
              v-model="searchKeyword"
              type="text" 
              placeholder="Tìm theo nhân viên / mã ca..."
              class="w-full pl-10 pr-4 py-2.5 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border border-gray-200 focus:border-[#EF972D] focus:ring-1 focus:ring-[#EF972D] rounded-xl outline-none text-sm transition-all"
              @input="fetchActivityLogs"
            />
          </div>
        </div>

        <!-- From Date -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Từ ngày</label>
          <input 
            v-model="fromDate"
            type="date"
            class="w-full px-4 py-2.5 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border border-gray-200 focus:border-[#EF972D] focus:ring-1 focus:ring-[#EF972D] rounded-xl outline-none text-sm transition-all"
            @change="fetchActivityLogs"
          />
        </div>

        <!-- To Date -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Đến ngày</label>
          <input 
            v-model="toDate"
            type="date"
            class="w-full px-4 py-2.5 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border border-gray-200 focus:border-[#EF972D] focus:ring-1 focus:ring-[#EF972D] rounded-xl outline-none text-sm transition-all"
            @change="fetchActivityLogs"
          />
        </div>

        <!-- Status Filter -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái đối soát</label>
          <div class="relative">
            <select 
              v-model="filterStatus"
              class="w-full appearance-none border border-gray-200 bg-gray-50 hover:bg-gray-100/60 focus:bg-white focus:border-[#EF972D] focus:ring-1 focus:ring-[#EF972D] py-2.5 pl-3 pr-10 rounded-xl outline-none text-sm transition-all cursor-pointer"
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ đối soát</option>
              <option value="approved">Đã đối soát</option>
              <option value="discrepancy">Ca lệch tiền</option>
            </select>
            <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" style="font-size: 18px;">expand_more</span>
          </div>
        </div>

        <!-- Reset & Actions -->
        <div>
          <button 
            @click="handleResetFilters"
            class="w-full py-2.5 border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[18px]">restart_alt</span>
            Đặt lại
          </button>
        </div>
      </div>
    </div>

    <!-- Data Table Card -->
    <div class="bg-white rounded-2xl shadow-xl border border-gray-150 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50/70 text-[#0D2533] uppercase text-xs font-bold border-b border-gray-100">
              <th class="py-4 px-6 text-center w-16">#</th>
              <th class="py-4 px-6">Ca phân công</th>
              <th class="py-4 px-6">Người chốt ca</th>
              <th class="py-4 px-6">Thời gian</th>
              <th class="py-4 px-6">Quỹ tiền mặt</th>
              <th class="py-4 px-6">Quỹ chuyển khoản</th>
              <th class="py-4 px-6">Tổng kết</th>
              <th class="py-4 px-6 text-center w-36">Trạng thái</th>
              <th class="py-4 px-6 text-center w-24">Chi tiết</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 text-sm">
            <tr v-if="loading" class="text-center">
              <td colspan="9" class="py-10 text-gray-400">Đang tải dữ liệu...</td>
            </tr>
            <tr v-else-if="filteredLogs.length === 0" class="text-center">
              <td colspan="9" class="py-10 text-gray-400">Không tìm thấy lịch sử hoạt động nào.</td>
            </tr>
            <tr v-else v-for="(log, index) in filteredLogs" :key="log.id" class="hover:bg-gray-50/50 transition-colors">
              <!-- STT -->
              <td class="py-4 px-6 text-center font-medium text-gray-500">{{ index + 1 }}</td>

              <!-- CA PHÂN CÔNG -->
              <td class="py-4 px-6">
                <div class="flex flex-col gap-1">
                  <div class="flex items-center gap-1.5">
                    <span class="px-2 py-0.5 bg-[#E3F2FD] text-[#0D47A1] rounded text-[11px] font-bold">
                      {{ log.maNhanVienNhanCa }}
                    </span>
                    <span class="font-bold text-[#0D2533]">{{ log.tenNhanVienNhanCa }}</span>
                  </div>
                  <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded w-max">
                    {{ log.tenCa }}
                  </span>
                </div>
              </td>

              <!-- NGƯỜI CHỐT CA -->
              <td class="py-4 px-6">
                <div class="flex flex-col gap-1 text-xs">
                  <div>
                    <span class="text-gray-400">Mở ca:</span>
                    <span class="font-bold ml-1 text-gray-600">{{ log.tenNhanVienNhanCa }}</span>
                  </div>
                  <div>
                    <span class="text-gray-400">Đóng ca:</span>
                    <span class="font-bold ml-1" :class="log.tenNguoiDongCa ? 'text-gray-600' : 'text-orange-500'">
                      {{ log.tenNguoiDongCa || 'Hệ thống tự động' }}
                    </span>
                  </div>
                </div>
              </td>

              <!-- THỜI GIAN -->
              <td class="py-4 px-6">
                <div class="flex flex-col gap-1 text-xs font-semibold text-gray-500">
                  <div class="flex items-center gap-1">
                    <span class="text-gray-400 w-8">Vào:</span>
                    <span>{{ formatDateTime(log.thoiGianMoCa).time }} {{ formatDateTime(log.thoiGianMoCa).day }}</span>
                  </div>
                  <div class="flex items-center gap-1" v-if="log.thoiGianDongCa">
                    <span class="text-gray-400 w-8">Ra:</span>
                    <span>{{ formatDateTime(log.thoiGianDongCa).time }} {{ formatDateTime(log.thoiGianDongCa).day }}</span>
                  </div>
                  <div class="flex items-center gap-1" v-else>
                    <span class="text-gray-400 w-8">Ra:</span>
                    <span class="text-green-500 font-bold">Đang chạy</span>
                  </div>
                </div>
              </td>

              <!-- QUỸ TIỀN MẶT -->
              <td class="py-4 px-6">
                <div class="flex flex-col gap-0.5 text-xs text-gray-600">
                  <div>
                    <span>Bán: </span>
                    <span class="font-bold">{{ formatCurrency(log.tienMatThuTrongCa) }}</span>
                  </div>
                  <div>
                    <span>Cốp: </span>
                    <span class="font-bold">{{ formatCurrency(log.tienMatThucTeChotCa) }}</span>
                  </div>
                  <div>
                    <span>Lệch: </span>
                    <span class="font-bold" :class="log.tienChenhLech >= 0 ? 'text-green-600' : 'text-red-500'">
                      {{ formatDiff(log.tienChenhLech) }}
                    </span>
                  </div>
                </div>
              </td>

              <!-- QUỸ CHUYỂN KHOẢN -->
              <td class="py-4 px-6 text-xs text-gray-600">
                <div>
                  <span>Bán: </span>
                  <span class="font-bold">{{ formatCurrency(log.tienChuyenKhoanTrongCa) }}</span>
                </div>
                <div>
                  <span>Cốp: </span>
                  <span class="font-bold">{{ formatCurrency(log.tienChuyenKhoanTrongCa) }}</span>
                </div>
                <div>
                  <span>Lệch: </span>
                  <span class="font-bold text-gray-400">0 đ</span>
                </div>
              </td>

              <!-- TỔNG KẾT -->
              <td class="py-4 px-6 text-xs">
                <div class="flex flex-col gap-0.5">
                  <div>
                    <span class="text-gray-400">DT:</span>
                    <span class="font-bold ml-1 text-[#0D2533]">
                      {{ formatCurrency((log.tienMatThuTrongCa || 0) + (log.tienChuyenKhoanTrongCa || 0)) }}
                    </span>
                  </div>
                  <div>
                    <span class="text-gray-400">Lệch:</span>
                    <span class="font-bold ml-1" :class="log.tienChenhLech >= 0 ? 'text-green-600' : 'text-red-500'">
                      {{ formatDiff(log.tienChenhLech) }}
                    </span>
                  </div>
                </div>
              </td>

              <!-- TRẠNG THÁI -->
              <td class="py-4 px-6 text-center">
                <div class="flex flex-col gap-1.5 items-center justify-center">
                  <span 
                    class="px-2.5 py-0.5 text-xs font-bold rounded-full shadow-sm"
                    :class="log.trangThai === 0 
                      ? 'bg-green-50 text-green-600 border border-green-100' 
                      : 'bg-red-50 text-red-600 border border-red-100'"
                  >
                    {{ log.trangThai === 0 ? 'Đang chạy' : 'Đã đóng' }}
                  </span>
                  
                  <span 
                    v-if="log.trangThai === 1"
                    class="px-2 py-0.5 text-[10px] font-bold rounded-md"
                    :class="!log.trangThaiDoiSoat 
                      ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                      : log.trangThaiDoiSoat === 1 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : 'bg-red-50 text-red-500 border border-red-100'"
                  >
                    {{ !log.trangThaiDoiSoat ? 'Chờ đối soát' : log.trangThaiDoiSoat === 1 ? 'Đã đối soát' : 'Sai lệch' }}
                  </span>
                </div>
              </td>

              <!-- CHI TIẾT -->
              <td class="py-4 px-6 text-center">
                <button 
                  @click="openDetailsModal(log)" 
                  class="p-2 text-gray-400 hover:text-[#EF972D] hover:bg-orange-50 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-orange-100"
                >
                  <span class="material-symbols-outlined text-[20px]">visibility</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Detail Modal -->
    <div 
      v-if="showDetailsModal && selectedLog" 
      class="fixed inset-0 bg-[#0D2533]/40 flex items-center justify-center z-50 p-4 transition-all duration-300"
    >
      <div 
        class="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden transform scale-100 transition-all duration-300"
      >
        <!-- Header -->
        <div class="p-6 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white">
          <h3 class="text-lg font-bold flex items-center gap-2">
            <span class="material-symbols-outlined">visibility</span>
            Chi Tiết Bàn Giao Ca
          </h3>
          <button 
            @click="closeDetailsModal" 
            class="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <!-- General Info -->
          <div class="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <div>
              <span class="text-xs font-semibold text-gray-400 block uppercase">Nhân viên nhận ca</span>
              <span class="text-sm font-bold text-[#0D2533]">{{ selectedLog.tenNhanVienNhanCa }} ({{ selectedLog.maNhanVienNhanCa }})</span>
            </div>
            <div>
              <span class="text-xs font-semibold text-gray-400 block uppercase">Ca phân công</span>
              <span class="text-sm font-bold text-[#0D2533]">{{ selectedLog.tenCa }}</span>
            </div>
            <div class="mt-2">
              <span class="text-xs font-semibold text-gray-400 block uppercase">Thời gian mở ca</span>
              <span class="text-sm font-medium text-gray-600 flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">schedule</span>
                {{ formatDateTime(selectedLog.thoiGianMoCa).time }} {{ formatDateTime(selectedLog.thoiGianMoCa).day }}
              </span>
            </div>
            <div class="mt-2">
              <span class="text-xs font-semibold text-gray-400 block uppercase">Thời gian đóng ca</span>
              <span class="text-sm font-medium text-gray-600 flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">schedule</span>
                {{ selectedLog.thoiGianDongCa 
                  ? `${formatDateTime(selectedLog.thoiGianDongCa).time} ${formatDateTime(selectedLog.thoiGianDongCa).day}` 
                  : '---' }}
              </span>
            </div>
          </div>

          <!-- Fund breakdown -->
          <div class="space-y-4">
            <h4 class="text-sm font-bold text-[#0D2533] border-b border-gray-100 pb-2">Chi Tiết Quỹ Tiền Mặt</h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex justify-between items-center py-1.5 border-b border-gray-50">
                <span class="text-sm text-gray-500">Tiền mặt đầu ca:</span>
                <span class="text-sm font-bold text-gray-700">{{ formatCurrency(selectedLog.tienMatDauCa) }}</span>
              </div>
              <div class="flex justify-between items-center py-1.5 border-b border-gray-50">
                <span class="text-sm text-gray-500">Tiền mặt thu trong ca:</span>
                <span class="text-sm font-bold text-gray-700">{{ formatCurrency(selectedLog.tienMatThuTrongCa) }}</span>
              </div>
              <div class="flex justify-between items-center py-1.5 border-b border-gray-50 col-span-2">
                <span class="text-sm text-gray-500">Tiền mặt chi ra / Hoàn trả:</span>
                <span class="text-sm font-bold text-red-500">- {{ formatCurrency(selectedLog.tienMatChiRa) }}</span>
              </div>
              <div class="flex justify-between items-center py-1.5 border-b border-gray-50 col-span-2">
                <span class="text-sm text-gray-500">Tổng tiền mặt lý thuyết:</span>
                <span class="text-sm font-bold text-gray-700">
                  {{ formatCurrency((selectedLog.tienMatDauCa || 0) + (selectedLog.tienMatThuTrongCa || 0) - (selectedLog.tienMatChiRa || 0)) }}
                </span>
              </div>
              <div class="flex justify-between items-center py-1.5 border-b border-gray-50 col-span-2">
                <span class="text-sm text-gray-500">Tiền mặt thực tế cốp ca:</span>
                <span class="text-sm font-bold text-[#0D2533]">{{ formatCurrency(selectedLog.tienMatThucTeChotCa) }}</span>
              </div>
              <div class="flex justify-between items-center py-1.5 border-b border-gray-50 col-span-2">
                <span class="text-sm text-gray-500">Tiền cốp để lại ca sau:</span>
                <span class="text-sm font-bold text-gray-700">{{ formatCurrency(selectedLog.tienGiaoCaSau) }}</span>
              </div>
              <div class="flex justify-between items-center py-1.5 border-b border-gray-50 col-span-2">
                <span class="text-sm text-gray-500">Tiền nộp lại quản lý:</span>
                <span class="text-sm font-bold text-emerald-600">{{ formatCurrency(Math.max(0, (selectedLog.tienMatThucTeChotCa || 0) - (selectedLog.tienGiaoCaSau || 0))) }}</span>
              </div>
            </div>
          </div>

          <!-- Shift Expenditures List -->
          <div class="space-y-3">
            <h4 class="text-sm font-bold text-[#0D2533] border-b border-gray-100 pb-2">Phiếu Chi Tiền Mặt Trong Ca</h4>
            <div class="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              <div v-if="selectedLogVouchers.length === 0" class="text-center py-4 text-gray-400 text-xs italic">
                Không ghi nhận phiếu chi tiền mặt nào trong ca trực này.
              </div>
              <div 
                v-else 
                v-for="voucher in selectedLogVouchers" 
                :key="voucher.id"
                class="flex justify-between items-start bg-gray-50 hover:bg-gray-100/70 p-3 rounded-xl border border-gray-100 transition-colors text-xs"
              >
                <div class="space-y-0.5">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-gray-700">{{ voucher.maPhieu }}</span>
                    <span class="text-[10px] text-gray-400">({{ voucher.ngayTao }})</span>
                  </div>
                  <p class="text-gray-500">Lý do: {{ voucher.lyDo }}</p>
                  <p class="text-[10px] text-gray-400">Người lập: {{ voucher.nguoiTao }}</p>
                </div>
                <span class="font-bold text-red-500 shrink-0 ml-3">- {{ formatCurrency(voucher.soTien) }}</span>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <h4 class="text-sm font-bold text-[#0D2533] border-b border-gray-100 pb-2">Chi Tiết Quỹ Chuyển Khoản</h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex justify-between items-center py-1.5 border-b border-gray-50">
                <span class="text-sm text-gray-500">Doanh thu chuyển khoản:</span>
                <span class="text-sm font-bold text-gray-700">{{ formatCurrency(selectedLog.tienChuyenKhoanTrongCa) }}</span>
              </div>
              <div class="flex justify-between items-center py-1.5 border-b border-gray-50">
                <span class="text-sm text-gray-500">Chênh lệch chuyển khoản:</span>
                <span class="text-sm font-bold text-gray-400">0 đ</span>
              </div>
            </div>
          </div>

          <!-- Summary Audit -->
          <div class="bg-orange-50/30 p-4 rounded-xl border border-orange-100/50 flex justify-between items-center">
            <div class="space-y-1">
              <span class="text-xs font-bold text-[#EF972D] uppercase tracking-wider block">Kết quả đối soát</span>
              <div class="text-xs text-gray-500">
                Doanh thu tổng: <span class="font-bold text-gray-700">{{ formatCurrency((selectedLog.tienMatThuTrongCa || 0) + (selectedLog.tienChuyenKhoanTrongCa || 0)) }}</span>
              </div>
            </div>
            <div class="text-right">
              <span class="text-xs text-gray-400 block font-semibold">Chênh lệch tổng</span>
              <span class="text-lg font-black" :class="selectedLog.tienChenhLech >= 0 ? 'text-green-600' : 'text-red-500'">
                {{ formatDiff(selectedLog.tienChenhLech) }}
              </span>
            </div>
          </div>

          <!-- Employee Discrepancy Explanation -->
          <div v-if="selectedLog.ghiChu && selectedLog.ghiChu.trim()" class="bg-amber-50/50 p-4 rounded-xl border border-amber-100 space-y-1 text-xs">
            <span class="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Giải trình chênh lệch của nhân viên</span>
            <p class="text-gray-700 leading-relaxed italic bg-white p-2.5 rounded-lg border border-amber-100/50 font-medium">
              "{{ selectedLog.ghiChu }}"
            </p>
          </div>

          <!-- Manager Audit Section -->
          <div 
            v-if="selectedLog.trangThai === 1"
            class="border-t border-gray-150 pt-5 space-y-4"
          >
            <h4 class="text-sm font-bold text-[#0D2533] flex items-center gap-1.5">
              <span class="material-symbols-outlined text-sm text-[#EF972D]">admin_panel_settings</span>
              Kế Toán Đối Soát (Dành Cho Quản Lý)
            </h4>

            <!-- If already audited -->
            <div v-if="selectedLog.trangThaiDoiSoat" class="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-2 text-xs">
              <div class="flex justify-between items-center font-semibold">
                <span class="text-gray-400">Trạng thái:</span>
                <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">Đã đối soát</span>
              </div>
              <div v-if="selectedLog.phuongAnXuLy" class="flex justify-between items-center font-semibold">
                <span class="text-gray-400">Phương án xử lý:</span>
                <span class="text-gray-800">
                  {{ selectedLog.phuongAnXuLy === 'TRU_LUONG' ? 'Khấu trừ vào lương' : selectedLog.phuongAnXuLy === 'CHI_PHI_CUA_HANG' ? 'Hạch toán chi phí' : 'Không xử lý / Bỏ qua' }}
                </span>
              </div>
              <div v-if="selectedLog.ghiChuDoiSoat" class="mt-2 text-gray-700">
                <span class="text-gray-400 block mb-0.5">Ghi chú đối soát:</span>
                <p class="italic bg-white p-2.5 rounded border border-gray-100">{{ selectedLog.ghiChuDoiSoat }}</p>
              </div>
            </div>

            <!-- If NOT audited yet -->
            <div v-else class="space-y-4">
              <!-- If there is a discrepancy, choose resolution -->
              <div v-if="selectedLog.tienChenhLech !== 0" class="space-y-1.5">
                <label class="text-xs font-bold text-gray-500 uppercase tracking-wider block">Phương án xử lý lệch tiền *</label>
                <div class="relative">
                  <select 
                    v-model="auditAction"
                    class="w-full appearance-none border border-gray-200 bg-white py-2 pl-3 pr-10 rounded-xl outline-none text-xs transition-all cursor-pointer font-bold text-gray-700 focus:border-[#EF972D]"
                  >
                    <option value="TRU_LUONG">Khấu trừ chênh lệch vào lương nhân viên trực ca</option>
                    <option value="CHI_PHI_CUA_HANG">Hạch toán lỗ vào chi phí vận hành cửa hàng</option>
                    <option value="KHONG_XU_LY">Bỏ qua / Không xử lý chênh lệch này</option>
                  </select>
                  <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold" style="font-size: 16px;">expand_more</span>
                </div>
              </div>

              <!-- Notes for audit -->
              <div class="space-y-1.5">
                <label class="text-xs font-bold text-gray-500 uppercase tracking-wider block">Ý kiến / Ghi chú đối soát</label>
                <textarea 
                  v-model="auditNotes"
                  rows="2"
                  placeholder="Nhập ghi chú xử lý chênh lệch hoặc phê duyệt ca..."
                  class="w-full px-3 py-2 bg-white border border-gray-200 focus:border-[#EF972D] rounded-xl outline-none text-xs transition-all"
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-gray-50 flex items-center justify-end gap-3 bg-gray-50/50">
          <button 
            @click="closeDetailsModal" 
            class="px-5 py-2.5 border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-xl font-bold text-sm transition-all cursor-pointer"
          >
            Đóng lại
          </button>
          <button 
            v-if="selectedLog.trangThai === 1 && !selectedLog.trangThaiDoiSoat"
            @click="handleApproveAudit(selectedLog)"
            :disabled="isAuditing"
            class="px-5 py-2.5 bg-gradient-to-r from-[#FFB74D] to-[#EF972D] hover:from-[#EF972D] hover:to-[#E68A1E] text-white rounded-xl shadow-md hover:shadow-lg font-bold text-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span v-if="isAuditing" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Xác nhận Đối soát
          </button>
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
</style>

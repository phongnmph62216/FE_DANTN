<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'

// States
const activityLogs = ref([])
const loading = ref(false)

// Filter states
const searchKeyword = ref('')
const fromDate = ref('')
const toDate = ref('')

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
    activityLogs.value = res.data || []
  } catch (error) {
    console.error('Error fetching activity logs:', error)
  } finally {
    loading.value = false
  }
}

const handleResetFilters = () => {
  searchKeyword.value = ''
  fromDate.value = ''
  toDate.value = ''
  fetchActivityLogs()
}

onMounted(() => {
  fetchActivityLogs()
})

// Details Modal State
const showDetailsModal = ref(false)
const selectedLog = ref(null)

const openDetailsModal = (log) => {
  selectedLog.value = log
  showDetailsModal.value = true
}

const closeDetailsModal = () => {
  selectedLog.value = null
  showDetailsModal.value = false
}

// Formatters
const formatCurrency = (val) => {
  if (val === null || val === undefined) return '0 đ'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
}

const formatDiff = (val) => {
  if (val === null || val === undefined) return '0 đ'
  const prefix = val > 0 ? '+' : ''
  return prefix + new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
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
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
            <tr v-else-if="activityLogs.length === 0" class="text-center">
              <td colspan="9" class="py-10 text-gray-400">Không tìm thấy lịch sử hoạt động nào.</td>
            </tr>
            <tr v-else v-for="(log, index) in activityLogs" :key="log.id" class="hover:bg-gray-50/50 transition-colors">
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
                <span 
                  class="px-3 py-1 text-xs font-bold rounded-full shadow-sm"
                  :class="log.trangThai === 0 
                    ? 'bg-green-50 text-green-600 border border-green-100' 
                    : 'bg-red-50 text-red-600 border border-red-100'"
                >
                  {{ log.trangThai === 0 ? 'Đang chạy' : 'Đã đóng' }}
                </span>
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
                <span class="text-sm text-gray-500">Tổng tiền mặt lý thuyết:</span>
                <span class="text-sm font-bold text-gray-700">
                  {{ formatCurrency((selectedLog.tienMatDauCa || 0) + (selectedLog.tienMatThuTrongCa || 0)) }}
                </span>
              </div>
              <div class="flex justify-between items-center py-1.5 border-b border-gray-50 col-span-2">
                <span class="text-sm text-gray-500">Tiền mặt thực tế cốp ca:</span>
                <span class="text-sm font-bold text-[#0D2533]">{{ formatCurrency(selectedLog.tienMatThucTeChotCa) }}</span>
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
        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-gray-50 flex items-center justify-end bg-gray-50/50">
          <button 
            @click="closeDetailsModal" 
            class="px-5 py-2.5 bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white rounded-xl shadow-md hover:shadow-lg font-bold text-sm transition-all cursor-pointer"
          >
            Đóng lại
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

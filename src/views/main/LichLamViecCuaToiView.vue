<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import viLocale from '@fullcalendar/core/locales/vi'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// View mode: 'table' or 'calendar'
const viewMode = ref('table')

// State variables
const schedules = ref([])
const shiftsList = ref([])
const isLoading = ref(false)

// Filter states
const filterStartDate = ref('')
const filterEndDate = ref('')
const filterStatus = ref('all') // 'all', 'active', 'past', 'upcoming'

// Toast notification
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

// Helpers
const formatDateVietnamese = (dateStr) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}

const getScheduleStatus = (item) => {
  if (!item) return 'upcoming'
  const todayStr = new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD
  if (item.ngayLamViec < todayStr) {
    return 'past' // "Đã qua"
  }
  if (item.ngayLamViec > todayStr) {
    return 'upcoming' // "Sắp tới"
  }
  
  const shift = getShift(item.idCaLamViec)
  if (!shift) return 'active'
  
  const now = new Date()
  const [yyyy, mm, dd] = item.ngayLamViec.split('-').map(Number)
  
  const [startHour, startMin] = shift.gioBatDau.split(':').map(Number)
  const shiftStart = new Date(yyyy, mm - 1, dd, startHour, startMin, 0)
  
  const [endHour, endMin] = shift.gioKetThuc.split(':').map(Number)
  let shiftEnd = new Date(yyyy, mm - 1, dd, endHour, endMin, 0)
  
  if (shiftEnd < shiftStart) {
    shiftEnd.setDate(shiftEnd.getDate() + 1)
  }
  
  if (now < shiftStart) {
    return 'upcoming'
  } else if (now >= shiftEnd) {
    return 'past'
  }
  return 'active'
}

const getStatusLabel = (item) => {
  const status = getScheduleStatus(item)
  if (status === 'active') return 'Đang làm'
  if (status === 'past') return 'Đã qua'
  return 'Sắp tới'
}

const getShift = (shiftId) => {
  return shiftsList.value.find(s => s.id == shiftId)
}

// Fetch schedules & shifts
const fetchSchedules = async () => {
  if (!authStore.user?.id) return
  isLoading.value = true
  try {
    const params = {
      idNhanVien: authStore.user.id
    }
    if (filterStartDate.value) {
      params.startDate = filterStartDate.value
    }
    if (filterEndDate.value) {
      params.endDate = filterEndDate.value
    }

    const [resShifts, resScheds] = await Promise.all([
      api.get('/api/v1/ca-lam-viec'),
      api.get('/api/v1/lich-lam-viec', { params })
    ])

    if (resShifts.data) {
      shiftsList.value = resShifts.data
    }
    if (resScheds.data) {
      schedules.value = resScheds.data
    }
  } catch (error) {
    console.error('Error fetching employee schedule:', error)
    showToast('Lỗi khi tải lịch làm việc!', 'error')
  } finally {
    isLoading.value = false
  }
}

// Watch filters to automatically refresh
watch([filterStartDate, filterEndDate], () => {
  fetchSchedules()
})

// Reset filters
const resetFilters = () => {
  filterStartDate.value = ''
  filterEndDate.value = ''
  filterStatus.value = 'all'
  fetchSchedules()
}

// Client-side status filtering & sorting
const filteredSchedules = computed(() => {
  let list = schedules.value
  if (filterStatus.value !== 'all') {
    list = list.filter(item => getScheduleStatus(item) === filterStatus.value)
  }
  return list
})

// Convert to FullCalendar events
const calendarEvents = computed(() => {
  return filteredSchedules.value.map(sched => {
    const shift = getShift(sched.idCaLamViec)
    const shiftName = shift ? shift.ten : 'Ca làm việc'
    const times = shift ? `${shift.gioBatDau.substring(0, 5)} - ${shift.gioKetThuc.substring(0, 5)}` : ''
    
    let color = '#7E57C2' // Default purple
    const status = getScheduleStatus(sched)
    if (status === 'active') color = '#EF972D' // orange
    else if (status === 'past') color = '#EF9A9A' // soft red
    else if (status === 'upcoming') color = '#42A5F5' // blue

    return {
      id: String(sched.id),
      title: `${shiftName} (${times})`,
      start: sched.ngayLamViec,
      allDay: true,
      backgroundColor: color,
      borderColor: color,
      textColor: '#ffffff',
      extendedProps: {
        note: sched.ghiChu || 'Không có ghi chú'
      }
    }
  })
})

// Export CSV for Excel
const exportExcel = () => {
  showToast('Đang tạo và tải danh sách lịch làm việc...', 'info')
  try {
    let csvContent = '\uFEFF' // BOM for UTF-8 compatibility
    csvContent += 'STT,Ngày làm việc,Ca làm việc,Thời gian,Ghi chú,Trạng thái\n'

    filteredSchedules.value.forEach((item, index) => {
      const shift = getShift(item.idCaLamViec)
      const shiftName = shift ? shift.ten : ''
      const shiftTime = shift ? `${shift.gioBatDau.substring(0, 5)} - ${shift.gioKetThuc.substring(0, 5)}` : ''
      const statusText = getStatusLabel(item)
      const note = item.ghiChu || '--'

      csvContent += `"${index + 1}","${formatDateVietnamese(item.ngayLamViec)}","${shiftName}","${shiftTime}","${note}","${statusText}"\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `lich_lam_viec_cua_toi_${new Date().toISOString().slice(0, 10)}.csv`)
    link.click()
    showToast('Tải tệp thành công!', 'success')
  } catch (error) {
    console.error(error)
    showToast('Có lỗi xảy ra khi tải tệp!', 'error')
  }
}

onMounted(() => {
  fetchSchedules()
})
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Screen Header -->
    <h1 class="font-headline-md text-headline-md text-inverse-surface mb-stack-lg font-bold uppercase text-[#EF972D]">
      LỊCH LÀM VIỆC CỦA TÔI
    </h1>

    <!-- Filter & Action Controls -->
    <section class="bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant/30 p-gutter flex flex-col md:flex-row justify-between items-center gap-gutter">
      <div class="flex flex-wrap gap-stack-md flex-1 w-full items-center">
        <!-- Start Date -->
        <div class="flex flex-col gap-1 w-full md:w-auto">
          <label class="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Từ ngày</label>
          <input 
            v-model="filterStartDate"
            type="date"
            class="px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-[#EF972D] focus:border-[#EF972D] font-body-md text-body-md transition-all cursor-pointer"
          />
        </div>

        <!-- End Date -->
        <div class="flex flex-col gap-1 w-full md:w-auto">
          <label class="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Đến ngày</label>
          <input 
            v-model="filterEndDate"
            type="date"
            class="px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-[#EF972D] focus:border-[#EF972D] font-body-md text-body-md transition-all cursor-pointer"
          />
        </div>

        <!-- Status Filter -->
        <div class="flex flex-col gap-1 w-full md:w-auto">
          <label class="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Trạng thái</label>
          <div class="relative">
            <select 
              v-model="filterStatus"
              class="appearance-none border border-outline-variant rounded-lg bg-surface-container-lowest py-2 pl-3 pr-10 focus:outline-none focus:ring-1 focus:ring-[#EF972D] focus:border-[#EF972D] font-body-md text-body-md text-on-surface-variant cursor-pointer transition-all w-full"
            >
              <option value="all">Tất cả</option>
              <option value="active">Đang làm</option>
              <option value="past">Đã qua</option>
              <option value="upcoming">Sắp tới</option>
            </select>
            <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" style="font-size: 20px;">expand_more</span>
          </div>
        </div>
      </div>

      <!-- Action Area -->
      <div class="flex gap-stack-md w-full md:w-auto justify-end mt-4 md:mt-0 items-end">
        <!-- Export Excel -->
        <button 
          @click="exportExcel"
          class="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface-container-low transition-all flex items-center gap-1.5 cursor-pointer hover:border-[#EF972D]"
        >
          <span class="material-symbols-outlined text-[16px] text-[#EF972D]">download</span>
          Xuất Excel
        </button>

        <!-- Clear Filter -->
        <button 
          @click="resetFilters"
          class="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface-container-low transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">restart_alt</span>
          Xóa bộ lọc
        </button>
      </div>
    </section>

    <!-- View Mode Switcher -->
    <div class="flex items-center gap-2 bg-gray-100 rounded-xl p-1 w-fit border border-gray-200">
      <button 
        @click="viewMode = 'table'"
        :class="viewMode === 'table' ? 'bg-[#EF972D] text-white shadow-md' : 'text-gray-600 hover:bg-gray-200/50'"
        class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
      >
        <span class="material-symbols-outlined text-[16px]">grid_on</span>
        Bảng
      </button>
      <button 
        @click="viewMode = 'calendar'"
        :class="viewMode === 'calendar' ? 'bg-[#EF972D] text-white shadow-md' : 'text-gray-600 hover:bg-gray-200/50'"
        class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
      >
        <span class="material-symbols-outlined text-[16px]">calendar_today</span>
        Lịch
      </button>
    </div>

    <!-- Data Display Section -->
    <section class="bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col min-h-[400px]">
      <div v-if="isLoading" class="p-12 flex flex-col items-center justify-center gap-3 flex-1">
        <div class="w-8 h-8 border-4 border-[#EF972D] border-t-transparent rounded-full animate-spin"></div>
        <span class="text-sm font-semibold text-on-surface-variant">Đang tải lịch làm việc...</span>
      </div>

      <div v-else-if="filteredSchedules.length === 0" class="p-12 text-center flex-1 flex flex-col items-center justify-center gap-2">
        <span class="material-symbols-outlined text-gray-400 text-5xl">calendar_today</span>
        <p class="text-sm text-gray-500 font-bold">Không có lịch làm việc nào trong khoảng thời gian này.</p>
      </div>

      <!-- Mode 1: Table View -->
      <div v-else-if="viewMode === 'table'" class="overflow-x-auto flex-1">
        <table class="w-full text-left border-collapse">
          <thead class="bg-surface border-b border-outline-variant sticky top-0">
            <tr>
              <th class="py-3.5 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap text-center w-20">STT</th>
              <th class="py-3.5 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap w-40 text-center">Ngày</th>
              <th class="py-3.5 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap w-64">Ca làm việc</th>
              <th class="py-3.5 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap w-48 text-center">Thời gian</th>
              <th class="py-3.5 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap">Ghi chú</th>
              <th class="py-3.5 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap text-center w-40">Trạng thái</th>
            </tr>
          </thead>
          <tbody class="font-body-md text-body-md divide-y divide-outline-variant/20">
            <tr 
              v-for="(item, index) in filteredSchedules" 
              :key="item.id"
              class="hover:bg-surface-container-low transition-colors"
            >
              <td class="py-4 px-6 text-center text-on-surface-variant font-medium">
                {{ index + 1 }}
              </td>
              <td class="py-4 px-6 text-center font-semibold text-gray-700 whitespace-nowrap">
                {{ formatDateVietnamese(item.ngayLamViec) }}
              </td>
              <td class="py-4 px-6">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#EF972D]/10 text-[#EF972D]">
                  {{ getShift(item.idCaLamViec)?.ten || 'Ca làm việc' }}
                </span>
              </td>
              <td class="py-4 px-6 text-center font-bold text-gray-600 whitespace-nowrap">
                {{ getShift(item.idCaLamViec) ? `${getShift(item.idCaLamViec).gioBatDau.substring(0, 5)} - ${getShift(item.idCaLamViec).gioKetThuc.substring(0, 5)}` : '--:--' }}
              </td>
              <td class="py-4 px-6 text-on-surface-variant">
                {{ item.ghiChu || '--' }}
              </td>
              <td class="py-4 px-6 text-center">
                <span 
                  v-if="getScheduleStatus(item) === 'active'"
                  class="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-[#EF972D] text-white shadow-sm"
                >
                  Đang làm
                </span>
                <span 
                  v-else-if="getScheduleStatus(item) === 'past'"
                  class="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-500 border border-red-150"
                >
                  Đã qua
                </span>
                <span 
                  v-else
                  class="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 border border-blue-150"
                >
                  Sắp tới
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mode 2: Calendar View -->
      <div v-else-if="viewMode === 'calendar'" class="p-6 fullcalendar-theme-wrapper">
        <FullCalendar 
          :options="{
            plugins: [dayGridPlugin],
            initialView: 'dayGridMonth',
            locale: viLocale,
            headerToolbar: {
              left: 'prev,next today',
              center: 'title',
              right: ''
            },
            events: calendarEvents,
            dayMaxEvents: 3,
            eventDidMount: (info) => {
              info.el.title = `Ghi chú: ${info.event.extendedProps.note}`;
            }
          }"
        />
      </div>
    </section>
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

<style>
/* Adjust FullCalendar month borders to match layout */
.fullcalendar-theme-wrapper {
  --fc-border-color: #f1f3f5;
  --fc-page-bg-color: #ffffff;
  --fc-today-bg-color: #fffaf0;
}
.fullcalendar-theme-wrapper .fc {
  font-family: inherit;
}
.fullcalendar-theme-wrapper .fc-theme-standard td, 
.fullcalendar-theme-wrapper .fc-theme-standard th {
  border: 1px solid var(--fc-border-color);
}
.fullcalendar-theme-wrapper .fc-col-header-cell {
  background-color: #fcf8f5;
  padding: 12px 0;
  font-size: 13px;
  font-weight: 700;
  color: #EF972D;
}
.fullcalendar-theme-wrapper .fc-daygrid-day-number {
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  padding: 6px 8px;
}
.fullcalendar-theme-wrapper .fc-event {
  border-radius: 6px;
  padding: 3px 6px;
  font-size: 11px;
  font-weight: 700;
  border: none !important;
  cursor: help;
}
</style>

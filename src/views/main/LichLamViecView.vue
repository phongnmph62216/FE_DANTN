<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import viLocale from '@fullcalendar/core/locales/vi'
import api from '@/services/api'

// View modes: 'calendar' or 'list'
const viewMode = ref('calendar')

// FullCalendar instance ref
const calendarRef = ref(null)
const calendarTitle = ref('Lịch Làm Việc')
const currentCalendarView = ref('dayGridMonth')

// Search & Filter state
const selectedEmployeeId = ref('')
const employees = ref([])
const shiftsList = ref([])

const activeShiftsList = computed(() => {
  return shiftsList.value.filter(s => Number(s.trangThai) === 1 || s.id == currentSchedule.value.idCaLamViec)
})

// Scheduled assignments list
const schedules = ref([])

// Multi-select Employee states
const selectedEmployeeIds = ref([])
const searchEmployeeQuery = ref('')
const showEmployeeDropdown = ref(false)

// Dropdown click outside closing handler
const clickOutsideHandler = (event) => {
  const relativeContainer = document.querySelector('.relative-dropdown-container')
  if (relativeContainer && !relativeContainer.contains(event.target)) {
    showEmployeeDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', clickOutsideHandler)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', clickOutsideHandler)
})

// Add/Remove employee from selections
const selectEmployee = (emp) => {
  if (isEditMode.value) {
    // In edit mode, allow only single employee
    selectedEmployeeIds.value = [emp.id]
    showEmployeeDropdown.value = false
    searchEmployeeQuery.value = ''
  } else {
    if (!selectedEmployeeIds.value.includes(emp.id)) {
      selectedEmployeeIds.value.push(emp.id)
    }
    searchEmployeeQuery.value = ''
  }
}

const removeEmployee = (empId) => {
  selectedEmployeeIds.value = selectedEmployeeIds.value.filter(id => id !== empId)
}

// Filtered employee dropdown list
const filteredEmployeesList = computed(() => {
  const query = searchEmployeeQuery.value.trim().toLowerCase()
  return employees.value.filter(emp => {
    const matchesQuery = !query || 
      emp.hoVaTen.toLowerCase().includes(query) || 
      emp.maNhanVien.toLowerCase().includes(query)
    
    if (!isEditMode.value) {
      return matchesQuery && !selectedEmployeeIds.value.includes(emp.id)
    }
    return matchesQuery
  })
})

// Modal control
const showModal = ref(false)
const isEditMode = ref(false)
const currentSchedule = ref({
  id: null,
  idNhanVien: '',
  idCaLamViec: '',
  ngayLamViec: '',
  ghiChu: '',
  trangThai: 1
})

const errors = ref({
  idNhanVien: '',
  idCaLamViec: '',
  ngayLamViec: ''
})

// Toast notification alert state
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

// Custom confirm dialog state
const confirmModal = ref({
  show: false,
  title: 'Xác nhận',
  message: '',
  onConfirm: null
})
const showConfirm = (message, onConfirm, title = 'Xác nhận') => {
  confirmModal.value = {
    show: true,
    title,
    message,
    onConfirm
  }
}
const handleConfirmAction = () => {
  if (confirmModal.value.onConfirm) {
    confirmModal.value.onConfirm()
  }
  confirmModal.value.show = false
}

// Recurrence states
const repeatType = ref('none') // 'none' or 'custom'
const showRepeatModal = ref(false)
const repeatInterval = ref(1)
const repeatUnit = ref('week') // 'week' or 'day'
const repeatDays = ref([]) // 1 (Mon) to 7 (Sun)
const repeatEndDate = ref('')

const handleRepeatTypeChange = () => {
  if (repeatType.value === 'custom') {
    showRepeatModal.value = true
    if (!repeatEndDate.value) {
      const start = new Date(currentSchedule.value.ngayLamViec || new Date())
      start.setMonth(start.getMonth() + 1)
      repeatEndDate.value = start.toISOString().split('T')[0]
    }
    if (repeatDays.value.length === 0) {
      const start = new Date(currentSchedule.value.ngayLamViec || new Date())
      let day = start.getDay()
      if (day === 0) day = 7
      repeatDays.value = [day]
    }
  }
}

const cancelRepeatConfig = () => {
  showRepeatModal.value = false
  if (repeatDays.value.length === 0) {
    repeatType.value = 'none'
  }
}

const confirmRepeatConfig = () => {
  if (repeatUnit.value === 'week' && repeatDays.value.length === 0) {
    showToast('Vui lòng chọn ít nhất một ngày trong tuần để lặp lại!', 'warning')
    return
  }
  if (!repeatEndDate.value) {
    showToast('Vui lòng chọn ngày kết thúc lặp lại!', 'warning')
    return
  }
  showRepeatModal.value = false
}

const toggleRepeatDay = (day) => {
  if (repeatDays.value.includes(day)) {
    repeatDays.value = repeatDays.value.filter(d => d !== day)
  } else {
    repeatDays.value.push(day)
  }
}

const formatDateVietnamese = (dateStr) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}

// Generate list of dates based on recurrence rules
const generateRecurrenceDates = (startDateStr, endDateStr, interval, unit, selectedDays) => {
  const dates = []
  const start = new Date(startDateStr)
  const end = new Date(endDateStr)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return [startDateStr]
  }

  let current = new Date(start)
  while (current <= end) {
    const yyyy = current.getFullYear()
    const mm = String(current.getMonth() + 1).padStart(2, '0')
    const dd = String(current.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}-${mm}-${dd}`

    if (unit === 'day') {
      const diffTime = Math.abs(current - start)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      if (diffDays % interval === 0) {
        dates.push(dateStr)
      }
    } else if (unit === 'week') {
      let dayOfWeek = current.getDay()
      if (dayOfWeek === 0) dayOfWeek = 7

      if (selectedDays.includes(dayOfWeek)) {
        const diffTime = current - start
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        const startDayOfWeek = start.getDay() === 0 ? 7 : start.getDay()
        
        const startWeekStart = new Date(start)
        startWeekStart.setDate(start.getDate() - (startDayOfWeek - 1))
        
        const currentWeekStart = new Date(current)
        currentWeekStart.setDate(current.getDate() - (dayOfWeek - 1))
        
        const weekDiffTime = Math.abs(currentWeekStart - startWeekStart)
        const weekDiffDays = Math.round(weekDiffTime / (1000 * 60 * 60 * 24))
        const weekIndex = Math.round(weekDiffDays / 7)
        
        if (weekIndex % interval === 0) {
          dates.push(dateStr)
        }
      }
    }
    current.setDate(current.getDate() + 1)
  }
  return dates.length > 0 ? dates : [startDateStr]
}

// Fetch initial data
const fetchData = async () => {
  try {
    const [resEmp, resShift, resSched] = await Promise.all([
      api.get('/api/v1/nhan-vien', { params: { size: 1000 } }),
      api.get('/api/v1/ca-lam-viec'),
      api.get('/api/v1/lich-lam-viec')
    ])
    if (resEmp.data && resEmp.data.content) {
      // Chỉ giữ lại nhân viên, loại bỏ quản lý/admin
      employees.value = resEmp.data.content.filter(emp => {
        const roleName = (emp.tenVaiTro || '').toLowerCase()
        return !(roleName.includes('quan') || roleName.includes('admin') || roleName.includes('quản'))
      })
    }
    if (resShift.data) {
      shiftsList.value = resShift.data
    }
    if (resSched.data) {
      schedules.value = resSched.data
    }
  } catch (error) {
    console.error('Error fetching data from backend', error)
  }
}

onMounted(() => {
  fetchData()
  setTimeout(updateCalendarTitle, 200)
})

// Update Calendar Title based on FullCalendar API
const updateCalendarTitle = () => {
  if (calendarRef.value) {
    const calendarApi = calendarRef.value.getApi()
    const view = calendarApi.view
    let titleStr = view.title

    // Capitalize Vietnamese months/days if needed
    if (titleStr) {
      calendarTitle.value = titleStr.charAt(0).toUpperCase() + titleStr.slice(1)
    }
  }
}

// FullCalendar navigation functions
const prev = () => {
  if (calendarRef.value) {
    const calendarApi = calendarRef.value.getApi()
    calendarApi.prev()
    updateCalendarTitle()
  }
}

const next = () => {
  if (calendarRef.value) {
    const calendarApi = calendarRef.value.getApi()
    calendarApi.next()
    updateCalendarTitle()
  }
}

const today = () => {
  if (calendarRef.value) {
    const calendarApi = calendarRef.value.getApi()
    calendarApi.today()
    updateCalendarTitle()
  }
}

const changeCalendarView = (viewName) => {
  currentCalendarView.value = viewName
  if (calendarRef.value) {
    const calendarApi = calendarRef.value.getApi()
    calendarApi.changeView(viewName)
    updateCalendarTitle()
  }
}

// Convert schedule array to FullCalendar events format
const calendarEvents = computed(() => {
  return schedules.value
    .filter(sched => {
      if (selectedEmployeeId.value) {
        return sched.idNhanVien == selectedEmployeeId.value
      }
      return true
    })
    .map(sched => {
      const emp = employees.value.find(e => e.id == sched.idNhanVien)
      const shift = shiftsList.value.find(s => s.id == sched.idCaLamViec)
      
      const empName = emp ? emp.hoVaTen : 'Nhân viên'
      const shiftName = shift ? shift.ten : 'Ca'
      const times = shift ? `(${shift.gioBatDau ? shift.gioBatDau.substring(0, 5) : ''} - ${shift.gioKetThuc ? shift.gioKetThuc.substring(0, 5) : ''})` : ''
      
      // Determine colors based on shift ID for visual interest
      let color = '#EF972D' // default orange
      if (sched.idCaLamViec % 3 === 1) color = '#1E88E5' // morning - blue
      else if (sched.idCaLamViec % 3 === 2) color = '#43A047' // afternoon - green
      else if (sched.idCaLamViec % 3 === 0) color = '#7E57C2' // night - purple

      return {
        id: String(sched.id),
        title: `${empName} - ${shiftName} ${times}`,
        start: sched.ngayLamViec,
        allDay: true,
        backgroundColor: color,
        borderColor: color,
        textColor: '#ffffff',
        extendedProps: {
          ...sched
        }
      }
    })
})

// FullCalendar Options configuration
const calendarOptions = ref({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  locale: viLocale,
  headerToolbar: false, // We render our own UI header toolbar
  editable: true,
  selectable: true,
  selectMirror: true,
  dayMaxEvents: 3,
  events: calendarEvents.value,
  // Event handler for cell clicking
  dateClick: (info) => {
    openCreateModal(info.dateStr)
  },
  // Event handler for clicking scheduled shift cards
  eventClick: (info) => {
    const props = info.event.extendedProps
    openEditModal({
      id: props.id,
      idNhanVien: props.idNhanVien,
      idCaLamViec: props.idCaLamViec,
      ngayLamViec: props.ngayLamViec,
      ghiChu: props.ghiChu,
      trangThai: props.trangThai
    })
  }
})

// Keep FullCalendar events synced with computed events
watch(calendarEvents, (newEvents) => {
  calendarOptions.value.events = newEvents
})

// Open create dialog
const openCreateModal = (dateStr = '') => {
  isEditMode.value = false
  currentSchedule.value = {
    id: null,
    idNhanVien: '',
    idCaLamViec: '',
    ngayLamViec: dateStr || new Date().toISOString().split('T')[0],
    ghiChu: '',
    trangThai: 1
  }
  selectedEmployeeIds.value = selectedEmployeeId.value ? [Number(selectedEmployeeId.value)] : []
  searchEmployeeQuery.value = ''
  showEmployeeDropdown.value = false

  // Clear recurrence values
  repeatType.value = 'none'
  repeatInterval.value = 1
  repeatUnit.value = 'week'
  repeatDays.value = []
  repeatEndDate.value = ''

  errors.value = { idNhanVien: '', idCaLamViec: '', ngayLamViec: '' }
  showModal.value = true
}

// Open edit dialog
const openEditModal = (schedule) => {
  isEditMode.value = true
  currentSchedule.value = { ...schedule }
  selectedEmployeeIds.value = [Number(schedule.idNhanVien)]
  searchEmployeeQuery.value = ''
  showEmployeeDropdown.value = false

  // Hide recurrence values in edit mode
  repeatType.value = 'none'

  errors.value = { idNhanVien: '', idCaLamViec: '', ngayLamViec: '' }
  showModal.value = true
}

// Close dialog
const closeModal = () => {
  showModal.value = false
}

// Save schedule details
const saveSchedule = async () => {
  let isValid = true
  errors.value = { idNhanVien: '', idCaLamViec: '', ngayLamViec: '' }

  if (selectedEmployeeIds.value.length === 0) {
    errors.value.idNhanVien = 'Vui lòng chọn ít nhất một nhân viên'
    isValid = false
  }

  if (!currentSchedule.value.idCaLamViec) {
    errors.value.idCaLamViec = 'Vui lòng chọn ca làm việc'
    isValid = false
  }

  if (!currentSchedule.value.ngayLamViec) {
    errors.value.ngayLamViec = 'Vui lòng chọn ngày làm việc'
    isValid = false
  }

  if (!isValid) return

  if (isEditMode.value) {
    const payload = {
      idNhanVien: Number(selectedEmployeeIds.value[0]),
      idCaLamViec: Number(currentSchedule.value.idCaLamViec),
      ngayLamViec: currentSchedule.value.ngayLamViec,
      ghiChu: currentSchedule.value.ghiChu || '',
      trangThai: currentSchedule.value.trangThai
    }
    try {
      await api.put(`/api/v1/lich-lam-viec/${currentSchedule.value.id}`, payload)
      showToast('Cập nhật lịch trực thành công!', 'success')
      await fetchData()
      closeModal()
    } catch (e) {
      console.error('API error on schedule edit', e)
      showToast(e.response?.data?.message || 'Có lỗi xảy ra khi cập nhật lịch trực', 'error')
    }
  } else {
    // Generate dates based on recurrence rules
    let datesToPost = [currentSchedule.value.ngayLamViec]
    if (repeatType.value === 'custom') {
      datesToPost = generateRecurrenceDates(
        currentSchedule.value.ngayLamViec,
        repeatEndDate.value,
        repeatInterval.value,
        repeatUnit.value,
        repeatDays.value
      )
    }

    try {
      const promises = []
      for (const date of datesToPost) {
        for (const empId of selectedEmployeeIds.value) {
          const payload = {
            idNhanVien: Number(empId),
            idCaLamViec: Number(currentSchedule.value.idCaLamViec),
            ngayLamViec: date,
            ghiChu: currentSchedule.value.ghiChu || '',
            trangThai: currentSchedule.value.trangThai
          }
          promises.push(api.post('/api/v1/lich-lam-viec', payload))
        }
      }
      await Promise.all(promises)
      showToast('Phân ca làm việc thành công!', 'success')
      await fetchData()
      closeModal()
    } catch (e) {
      console.error('API error on schedule create', e)
      showToast(e.response?.data?.message || 'Có lỗi xảy ra khi phân ca làm việc', 'error')
    }
  }
}

// Delete shift assignment
const deleteSchedule = async () => {
  if (!currentSchedule.value.id) return
  showConfirm(
    'Bạn có chắc chắn muốn xóa lịch trực này không? Hành động này không thể hoàn tác.',
    async () => {
      try {
        await api.delete(`/api/v1/lich-lam-viec/${currentSchedule.value.id}`)
        showToast('Xóa lịch trực thành công!', 'success')
        await fetchData()
        closeModal()
      } catch (e) {
        console.error('API error on schedule delete', e)
        showToast(e.response?.data?.message || 'Có lỗi xảy ra khi xóa lịch trực', 'error')
      }
    },
    'Xóa lịch trực'
  )
}

// Template download
const downloadTemplate = async () => {
  try {
    showToast('Đang tải xuống tệp biểu mẫu excel lịch làm việc...', 'info')
    const res = await api.get('/api/v1/lich-lam-viec/download-template', { responseType: 'blob' })
    
    // Create download link
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'mau_import_lich_lam_viec.xlsx')
    document.body.appendChild(link)
    link.click()
    
    setTimeout(() => {
      if (document.body.contains(link)) {
        link.remove()
      }
      window.URL.revokeObjectURL(url)
    }, 10000)
    
    showToast('Tải tệp biểu mẫu thành công!', 'success')
  } catch (error) {
    console.error('Failed to download template', error)
    showToast('Tải tệp biểu mẫu thất bại!', 'error')
  }
}

// Excel import
const importExcel = () => {
  const fileSelector = document.createElement('input')
  fileSelector.type = 'file'
  fileSelector.accept = '.xlsx, .xls'
  fileSelector.onchange = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    showToast('Đang tải lên và xử lý tệp Excel...', 'info')
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.post('/api/v1/lich-lam-viec/import-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      const message = res.data || 'Nhập lịch làm việc từ Excel thành công!'
      
      if (message.includes('Bỏ qua:') || message.includes('Chi tiết lỗi:')) {
        showConfirm(
          message,
          () => {},
          'Kết quả nhập dữ liệu Excel'
        )
      } else {
        showToast(message, 'success')
      }
      
      await fetchData()
    } catch (e) {
      console.error('API error on Excel import', e)
      showToast(e.response?.data?.message || 'Có lỗi xảy ra khi nhập dữ liệu từ Excel', 'error')
    }
  }
  fileSelector.click()
}

// Get display helpers for list view
const getEmployeeName = (empId) => {
  const e = employees.value.find(emp => emp.id == empId)
  return e ? e.hoVaTen : 'Không rõ'
}

const getShiftInfo = (shiftId) => {
  const s = shiftsList.value.find(shift => shift.id == shiftId)
  return s ? `${s.ten} (${s.gioBatDau ? s.gioBatDau.substring(0, 5) : ''} - ${s.gioKetThuc ? s.gioKetThuc.substring(0, 5) : ''})` : 'Không rõ'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header Page title -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-[#0D2533]">Quản Lý Lịch Làm Việc</h1>
        <p class="text-sm text-gray-500 mt-1">Lập kế hoạch phân chia ca trực và phân bổ nhân sự cho các ngày làm việc.</p>
      </div>
    </div>

    <!-- Filters and Actions Container -->
    <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <!-- Left: Filters -->
        <div class="flex items-center gap-4 flex-1">
          <div class="flex flex-col gap-1.5 w-full max-w-xs">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Lọc theo nhân viên</label>
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-3 text-gray-400 text-lg">person</span>
              <select 
                v-model="selectedEmployeeId"
                class="w-full pl-10 pr-8 py-2 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border border-gray-200 focus:border-[#EF972D] focus:ring-1 focus:ring-[#EF972D] rounded-xl outline-none text-sm appearance-none transition-all cursor-pointer"
              >
                <option value="">Tất cả nhân viên</option>
                <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                  {{ emp.hoVaTen }} ({{ emp.maNhanVien }})
                </option>
              </select>
              <span class="material-symbols-outlined absolute right-3 text-gray-400 text-lg pointer-events-none">keyboard_arrow_down</span>
            </div>
          </div>
        </div>

        <!-- Right: Action Buttons -->
        <div class="flex flex-wrap items-center gap-3">
          <!-- Download template -->
          <button 
            @click="downloadTemplate"
            class="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-[#EF972D] rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            <span class="material-symbols-outlined text-[18px]">download</span>
            Tải template
          </button>
          
          <!-- Import Excel -->
          <button 
            @click="importExcel"
            class="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-[#EF972D] rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            <span class="material-symbols-outlined text-[18px]">upload</span>
            Import Excel
          </button>
          
          <!-- Add New Schedule -->
          <button 
            @click="openCreateModal('')"
            class="bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white px-5 py-2 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer font-bold text-sm"
          >
            <span class="material-symbols-outlined text-[18px]">add</span>
            Thêm mới lịch làm việc
          </button>
        </div>
      </div>
    </div>

    <!-- Calendar view card wrapper -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 space-y-6">
      <!-- Calendar Header UI -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-50 pb-4">
        <!-- View Toggle (Bảng vs Lịch) -->
        <div class="flex items-center bg-gray-100/80 p-1 rounded-xl w-fit">
          <button 
            @click="viewMode = 'list'"
            class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
            :class="viewMode === 'list' ? 'bg-white shadow-sm text-[#EF972D]' : 'text-gray-500 hover:text-gray-700'"
          >
            Bảng
          </button>
          <button 
            @click="viewMode = 'calendar'"
            class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
            :class="viewMode === 'calendar' ? 'bg-white shadow-sm text-[#EF972D]' : 'text-gray-500 hover:text-gray-700'"
          >
            Lịch
          </button>
        </div>

        <!-- Custom calendar navigation controls (Active only in Calendar mode) -->
        <div v-show="viewMode === 'calendar'" class="flex items-center gap-4">
          <div class="flex items-center border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <button @click="prev" class="px-3 py-1.5 hover:bg-gray-50 text-gray-600 transition-colors border-r border-gray-100 flex items-center justify-center cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <span class="px-4 py-1.5 font-bold text-[#0D2533] bg-gray-50 text-sm whitespace-nowrap">
              {{ calendarTitle }}
            </span>
            <button @click="next" class="px-3 py-1.5 hover:bg-gray-50 text-gray-600 transition-colors flex items-center justify-center cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
          <button @click="today" class="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-600 transition-all cursor-pointer">
            Hôm nay
          </button>
        </div>

        <!-- View switches (Day/Week/Month) -->
        <div v-show="viewMode === 'calendar'" class="flex items-center bg-gray-100/80 p-1 rounded-xl w-fit">
          <button 
            @click="changeCalendarView('timeGridDay')"
            class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
            :class="currentCalendarView === 'timeGridDay' ? 'bg-white shadow-sm text-[#EF972D]' : 'text-gray-500 hover:text-gray-700'"
          >
            Ngày
          </button>
          <button 
            @click="changeCalendarView('timeGridWeek')"
            class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
            :class="currentCalendarView === 'timeGridWeek' ? 'bg-white shadow-sm text-[#EF972D]' : 'text-gray-500 hover:text-gray-700'"
          >
            Tuần
          </button>
          <button 
            @click="changeCalendarView('dayGridMonth')"
            class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
            :class="currentCalendarView === 'dayGridMonth' ? 'bg-white shadow-sm text-[#EF972D]' : 'text-gray-500 hover:text-gray-700'"
          >
            Tháng
          </button>
        </div>
      </div>

      <!-- Calendar Container -->
      <div v-show="viewMode === 'calendar'" class="fullcalendar-theme-wrapper">
        <FullCalendar 
          ref="calendarRef" 
          :options="calendarOptions" 
        />
      </div>

      <!-- List/Table View (fallback view option) -->
      <div v-show="viewMode === 'list'" class="overflow-x-auto">
        <table class="w-full border-collapse text-left">
          <thead>
            <tr class="bg-gray-50/70 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <th class="py-4 px-6 text-center w-16">STT</th>
              <th class="py-4 px-6">Nhân viên</th>
              <th class="py-4 px-6">Ngày làm việc</th>
              <th class="py-4 px-6">Ca làm việc</th>
              <th class="py-4 px-6">Ghi chú</th>
              <th class="py-4 px-6 text-center w-28">Thao tác</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 text-sm">
            <tr v-if="schedules.length === 0" class="text-center">
              <td colspan="6" class="py-10 text-gray-400">Không có lịch làm việc nào được lên lịch.</td>
            </tr>
            <tr v-else v-for="(sched, index) in schedules" :key="sched.id" class="hover:bg-gray-50/50 transition-colors">
              <td class="py-4 px-6 text-center font-medium text-gray-500">{{ index + 1 }}</td>
              <td class="py-4 px-6 font-bold text-[#0D2533]">{{ getEmployeeName(sched.idNhanVien) }}</td>
              <td class="py-4 px-6 text-gray-500 font-medium">{{ sched.ngayLamViec }}</td>
              <td class="py-4 px-6">
                <span class="px-2.5 py-1 text-xs font-bold bg-orange-50 text-[#EF972D] rounded-full">
                  {{ getShiftInfo(sched.idCaLamViec) }}
                </span>
              </td>
              <td class="py-4 px-6 text-gray-400">{{ sched.ghiChu || '---' }}</td>
              <td class="py-4 px-6 text-center">
                <button 
                  @click="openEditModal(sched)" 
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

    <!-- Add/Edit Schedule Modal -->
    <div 
      v-if="showModal" 
      class="fixed inset-0 bg-[#0D2533]/40 flex items-center justify-center z-50 p-4 transition-all duration-300"
    >
      <div 
        class="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden transform scale-100 transition-all duration-300"
      >
        <!-- Header -->
        <div class="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <h3 class="text-lg font-bold text-[#0D2533] flex items-center gap-2">
            <span class="material-symbols-outlined text-[#EF972D]">calendar_month</span>
            {{ isEditMode ? 'Cập Nhật Lịch Trực' : 'Phân Bổ Lịch Làm Việc' }}
          </h3>
          <button 
            @click="closeModal" 
            class="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-4">
          <!-- Employee -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Nhân viên <span class="text-red-500">*</span></label>
            
            <!-- Selected Employees Chips (Visible only if there are selections) -->
            <div 
              v-if="selectedEmployeeIds.length > 0" 
              class="flex flex-wrap gap-2 p-2 border border-gray-150 rounded-xl bg-gray-50/40 mb-1.5 max-h-36 overflow-y-auto"
            >
              <div 
                v-for="id in selectedEmployeeIds" 
                :key="id" 
                class="flex items-center gap-1.5 px-3 py-1.5 bg-[#E3F2FD] text-[#0D47A1] rounded-full text-xs font-bold shadow-sm transition-all"
              >
                <span>{{ getEmployeeName(id) }}</span>
                <button 
                  type="button"
                  @click="removeEmployee(id)" 
                  class="hover:text-red-600 text-gray-400 focus:outline-none flex items-center justify-center font-bold"
                >
                  <span class="material-symbols-outlined text-sm font-bold">close</span>
                </button>
              </div>
            </div>

            <!-- Search input / Dropdown Container -->
            <div class="relative relative-dropdown-container">
              <div class="relative flex items-center">
                <span class="material-symbols-outlined absolute left-3 text-gray-400 text-lg pointer-events-none">search</span>
                <input 
                  type="text" 
                  v-model="searchEmployeeQuery"
                  @focus="showEmployeeDropdown = true"
                  placeholder="Tìm và chọn nhân viên..."
                  class="w-full pl-10 pr-4 py-2.5 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border focus:border-[#EF972D] focus:ring-1 focus:ring-[#EF972D] rounded-xl outline-none text-sm transition-all"
                  :class="errors.idNhanVien ? 'border-red-300' : 'border-gray-200'"
                />
              </div>
              
              <!-- Dropdown list -->
              <div 
                v-if="showEmployeeDropdown" 
                class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto"
              >
                <div v-if="filteredEmployeesList.length === 0" class="p-3 text-xs text-gray-400 text-center">
                  Không tìm thấy nhân viên nào phù hợp.
                </div>
                <div 
                  v-else
                  v-for="emp in filteredEmployeesList" 
                  :key="emp.id"
                  @click="selectEmployee(emp)"
                  class="px-4 py-2.5 hover:bg-orange-50/50 text-sm text-[#0D2533] cursor-pointer transition-colors flex items-center justify-between"
                  :class="selectedEmployeeIds.includes(emp.id) ? 'bg-orange-50/30' : ''"
                >
                  <div class="flex flex-col">
                    <span class="font-bold">{{ emp.hoVaTen }}</span>
                    <span class="text-xs text-gray-400 font-mono">{{ emp.maNhanVien }}</span>
                  </div>
                  <span v-if="selectedEmployeeIds.includes(emp.id)" class="material-symbols-outlined text-[#EF972D] text-lg">check</span>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between text-xs text-gray-400 mt-1">
              <span>Đã chọn {{ selectedEmployeeIds.length }} nhân viên</span>
              <span v-if="errors.idNhanVien" class="text-red-500 font-semibold">{{ errors.idNhanVien }}</span>
            </div>
          </div>

          <!-- Shift -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Ca làm việc <span class="text-red-500">*</span></label>
            <div class="relative flex items-center">
              <select 
                v-model="currentSchedule.idCaLamViec"
                class="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border focus:border-[#EF972D] focus:ring-1 focus:ring-[#EF972D] rounded-xl outline-none text-sm appearance-none cursor-pointer transition-all"
                :class="errors.idCaLamViec ? 'border-red-300' : 'border-gray-200'"
              >
                <option value="">Chọn ca làm việc...</option>
                <option v-for="s in activeShiftsList" :key="s.id" :value="s.id">
                  {{ s.ten }} ({{ s.gioBatDau ? s.gioBatDau.substring(0, 5) : '' }} - {{ s.gioKetThuc ? s.gioKetThuc.substring(0, 5) : '' }})
                </option>
              </select>
              <span class="material-symbols-outlined absolute right-3 text-gray-400 pointer-events-none">keyboard_arrow_down</span>
            </div>
            <span v-if="errors.idCaLamViec" class="text-xs text-red-500 font-semibold">{{ errors.idCaLamViec }}</span>
          </div>

          <!-- Date -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Ngày làm việc <span class="text-red-500">*</span></label>
            <input 
              v-model="currentSchedule.ngayLamViec"
              type="date"
              class="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border focus:border-[#EF972D] focus:ring-1 focus:ring-[#EF972D] rounded-xl outline-none text-sm transition-all"
              :class="errors.ngayLamViec ? 'border-red-300' : 'border-gray-200'"
            />
            <span v-if="errors.ngayLamViec" class="text-xs text-red-500 font-semibold">{{ errors.ngayLamViec }}</span>
          </div>

          <!-- Notes -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Ghi chú</label>
            <textarea 
              v-model="currentSchedule.ghiChu"
              rows="3"
              placeholder="Ghi chú công việc, vị trí đứng trực..."
              class="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border border-gray-200 focus:border-[#EF972D] focus:ring-1 focus:ring-[#EF972D] rounded-xl outline-none text-sm transition-all resize-none"
            ></textarea>
          </div>

          <!-- Repeat Selection (Visible in Create mode only) -->
          <div class="flex flex-col gap-1.5" v-if="!isEditMode">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Lặp lại</label>
            <div class="relative flex items-center relative-repeat-container">
              <span class="material-symbols-outlined absolute left-3 text-[#EF972D] text-lg pointer-events-none">sync</span>
              <select 
                v-model="repeatType"
                @change="handleRepeatTypeChange"
                class="w-full pl-10 pr-8 py-2 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border border-gray-200 focus:border-[#EF972D] focus:ring-1 focus:ring-[#EF972D] rounded-xl outline-none text-sm appearance-none cursor-pointer transition-all"
              >
                <option value="none">Không lặp lại</option>
                <option value="custom">Tùy chỉnh lặp lại...</option>
              </select>
              <span class="material-symbols-outlined absolute right-3 text-gray-400 pointer-events-none">keyboard_arrow_down</span>
            </div>
            
            <!-- Summary of custom repeat configuration if active -->
            <div v-if="repeatType === 'custom'" class="text-xs text-[#EF972D] font-semibold mt-1 flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">info</span>
              Lặp lại mỗi {{ repeatInterval }} {{ repeatUnit === 'week' ? 'tuần' : 'ngày' }} 
              <span v-if="repeatUnit === 'week'">vào {{ repeatDays.map(d => d === 7 ? 'CN' : 'T' + (d + 1)).join(', ') }}</span> 
              đến {{ repeatEndDate ? formatDateVietnamese(repeatEndDate) : 'chưa chọn ngày kết thúc' }}
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div>
            <button 
              v-if="isEditMode"
              @click="deleteSchedule" 
              class="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <span class="material-symbols-outlined text-[16px]">delete</span>
              Xóa lịch trực
            </button>
          </div>
          <div class="flex items-center gap-3">
            <button 
              @click="closeModal" 
              class="px-4 py-2 border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button 
              @click="saveSchedule" 
              class="px-5 py-2 bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white rounded-xl shadow-md hover:shadow-lg font-bold text-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              Lưu lại
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Recurrence Modal -->
    <div 
      v-if="showRepeatModal" 
      class="fixed inset-0 bg-[#0D2533]/50 flex items-center justify-center z-[60] p-4 transition-all"
    >
      <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 overflow-hidden transform scale-100 transition-all">
        <!-- Header -->
        <div class="p-5 bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white flex items-center justify-between">
          <h3 class="text-base font-bold flex items-center gap-2">
            <span class="material-symbols-outlined">sync</span>
            Tuỳ chỉnh lặp lại
          </h3>
          <button 
            @click="cancelRepeatConfig" 
            class="text-white/80 hover:text-white cursor-pointer"
          >
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-5">
          <!-- Interval -->
          <div class="flex items-center justify-between gap-4">
            <span class="text-sm font-bold text-gray-600">Lặp lại mỗi:</span>
            <div class="flex items-center gap-2">
              <input 
                type="number" 
                v-model.number="repeatInterval" 
                min="1" 
                class="w-16 px-2.5 py-1.5 border border-gray-200 rounded-lg text-center font-bold text-sm focus:border-[#EF972D] outline-none"
              />
              <select 
                v-model="repeatUnit"
                class="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold focus:border-[#EF972D] outline-none cursor-pointer"
              >
                <option value="day">Ngày</option>
                <option value="week">Tuần</option>
              </select>
            </div>
          </div>

          <!-- Weekday Selection -->
          <div class="space-y-2" v-if="repeatUnit === 'week'">
            <span class="text-sm font-bold text-gray-600 block">Vào các ngày:</span>
            <div class="flex items-center justify-between gap-1">
              <button 
                v-for="day in [1, 2, 3, 4, 5, 6, 7]" 
                :key="day"
                type="button"
                @click="toggleRepeatDay(day)"
                class="w-8 h-8 rounded-full border text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                :class="repeatDays.includes(day) 
                  ? 'bg-[#EF972D] border-[#EF972D] text-white shadow-sm' 
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'"
              >
                {{ day === 7 ? 'CN' : 'T' + (day + 1) }}
              </button>
            </div>
          </div>

          <!-- End Date -->
          <div class="space-y-1.5">
            <span class="text-sm font-bold text-gray-600 block">Kết thúc:</span>
            <input 
              type="date" 
              v-model="repeatEndDate"
              class="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border border-gray-200 focus:border-[#EF972D] focus:ring-1 focus:ring-[#EF972D] rounded-xl outline-none text-sm transition-all"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 bg-gray-50/50 border-t border-gray-50 flex items-center justify-end gap-2.5">
          <button 
            @click="cancelRepeatConfig" 
            class="px-4 py-2 border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button 
            @click="confirmRepeatConfig" 
            class="px-5 py-2 bg-[#EF972D] text-white rounded-xl shadow-md hover:shadow-lg font-bold text-xs transition-all cursor-pointer"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Custom Confirm Modal -->
  <div v-if="confirmModal.show" class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 transition-all duration-300">
    <div class="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col animate-scaleIn">
      <!-- Header -->
      <div class="p-5 border-b border-gray-100 flex items-center gap-3 bg-[#EF972D]/10 text-[#EF972D]">
        <span class="material-symbols-outlined text-[24px]">warning</span>
        <h3 class="font-headline-sm text-base font-bold">{{ confirmModal.title }}</h3>
      </div>
      <!-- Body -->
      <div class="p-6 text-sm text-gray-650 font-body-md leading-relaxed">
        {{ confirmModal.message }}
      </div>
      <!-- Footer -->
      <div class="p-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
        <button 
          @click="confirmModal.show = false"
          class="px-4 py-2 border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-xl font-bold text-xs cursor-pointer transition-colors"
        >
          Hủy
        </button>
        <button 
          @click="handleConfirmAction"
          class="px-5 py-2 bg-[#EF972D] hover:bg-[#D87D15] text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer"
        >
          Đồng ý
        </button>
      </div>
    </div>
  </div>

  <!-- Toast Alert -->
  <div 
    v-if="toast.show" 
    class="fixed bottom-5 right-5 z-[10001] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border transition-all duration-300 transform translate-y-0"
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
    <button @click="toast.show = false" class="ml-4 text-gray-400 hover:text-gray-650 cursor-pointer">
      <span class="material-symbols-outlined text-sm">close</span>
    </button>
  </div>
</template>

<style>
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-scaleIn {
  animation: scaleIn 0.2s ease-out forwards;
}
/* FullCalendar custom styling to match dashboard aesthetics */
.fullcalendar-theme-wrapper {
  --fc-border-color: #f1f3f5;
  --fc-page-bg-color: #ffffff;
  --fc-today-bg-color: #fff8f0;
}

.fullcalendar-theme-wrapper .fc {
  font-family: inherit;
}

.fullcalendar-theme-wrapper .fc-theme-standard td, 
.fullcalendar-theme-wrapper .fc-theme-standard th {
  border: 1px solid var(--fc-border-color);
}

.fullcalendar-theme-wrapper .fc-col-header-cell {
  background-color: #fafbfc;
  padding: 10px 0;
  font-size: 13px;
  font-weight: 700;
  color: #0d2533;
}

.fullcalendar-theme-wrapper .fc-daygrid-day-number {
  font-size: 13px;
  font-weight: 600;
  color: #555c63;
  padding: 8px 10px;
}

/* Event cards styling */
.fullcalendar-theme-wrapper .fc-event {
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 700;
  margin: 2px 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  border: none !important;
  cursor: pointer;
  transition: all 0.2s ease;
}

.fullcalendar-theme-wrapper .fc-event:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  filter: brightness(0.95);
}

/* Day grid cell hover "+" button effect */
.fullcalendar-theme-wrapper .fc-daygrid-day {
  transition: background-color 0.15s ease;
  position: relative;
}

.fullcalendar-theme-wrapper .fc-daygrid-day:hover {
  background-color: #fcfcfc;
  cursor: pointer;
}

/* Hide navigation buttons natively provided by fc since we render custom ones */
.fullcalendar-theme-wrapper .fc-header-toolbar {
  display: none !important;
}

/* Styling for day grid events limits indicator link */
.fullcalendar-theme-wrapper .fc-daygrid-more-link {
  font-size: 11px;
  font-weight: 700;
  color: #EF972D !important;
  padding-left: 8px;
}
</style>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import api from '@/services/api'

// Filter states
const searchQuery = ref('')
const startTimeFilter = ref('')
const endTimeFilter = ref('')
const statusFilter = ref('all') // 'all', 'active', 'inactive'

// Loading states
const loading = ref(false)

// Shift list data
const shifts = ref([])
const todayGiaoCaList = ref([])

// Modal states
const showModal = ref(false)
const isEditMode = ref(false)

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

// Toast notification alert state
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

const currentShift = ref({
  id: null,
  ma: '',
  ten: '',
  gioBatDau: '',
  gioKetThuc: '',
  trangThai: 1
})

// Validation error states
const errors = ref({
  ten: '',
  gioBatDau: '',
  gioKetThuc: ''
})

// Fetch shifts from backend
const fetchShifts = async () => {
  loading.value = true
  try {
    const params = {}
    if (searchQuery.value.trim()) params.keyword = searchQuery.value.trim()
    if (startTimeFilter.value) params.startTime = startTimeFilter.value
    if (endTimeFilter.value) params.endTime = endTimeFilter.value
    if (statusFilter.value !== 'all') {
      params.trangThai = statusFilter.value === 'active' ? 1 : 0
    }

    // Get today's start and end timestamps
    const todayStr = new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD
    const fromDate = `${todayStr} 00:00:00`
    const toDate = `${todayStr} 23:59:59`

    const [response, responseGiaoCa] = await Promise.all([
      api.get('/api/v1/ca-lam-viec', { params }),
      api.get('/api/v1/giao-ca', { params: { fromDate, toDate } })
    ])

    if (response.data) {
      shifts.value = response.data
    }
    if (responseGiaoCa.data) {
      todayGiaoCaList.value = responseGiaoCa.data
    }
  } catch (error) {
    console.error('Failed to fetch shifts from backend', error)
  } finally {
    loading.value = false
  }
}

const getTodayGiaoCaStatus = (shift) => {
  if (!shift) return 'CHUA_MO'
  const records = todayGiaoCaList.value.filter(gc => gc.idCaLamViec == shift.id || gc.tenCa === shift.ten)
  if (records.length === 0) {
    return 'CHUA_MO'
  }
  const hasActive = records.some(gc => gc.trangThai === 0)
  if (hasActive) {
    return 'DANG_MO'
  }
  const hasClosed = records.some(gc => gc.trangThai === 1)
  if (hasClosed) {
    return 'DA_DONG'
  }
  return 'CHUA_MO'
}

// Watch filters to reload data from backend
watch([searchQuery, startTimeFilter, endTimeFilter, statusFilter], () => {
  fetchShifts()
})

onMounted(() => {
  fetchShifts()
})

// Filtered list (completely backend-driven)
const filteredShifts = computed(() => {
  return shifts.value
})

// Toggle shift status
const toggleStatus = (shift) => {
  if (!shift) return
  const isActivating = Number(shift.trangThai) !== 1
  const actionText = isActivating ? 'kích hoạt' : 'ngưng hoạt động'
  
  showConfirm(
    `Bạn có chắc chắn muốn ${actionText} ca làm việc "${shift.ten}" không?`,
    async () => {
      try {
        await api.put(`/api/v1/ca-lam-viec/${shift.id}/trang-thai`)
        showToast(`${isActivating ? 'Kích hoạt' : 'Ngưng hoạt động'} ca làm việc thành công!`, 'success')
        await fetchShifts()
      } catch (error) {
        console.error('Failed to update status on server', error)
        showToast(error.response?.data?.message || 'Có lỗi xảy ra khi thay đổi trạng thái ca làm việc', 'error')
      }
    },
    'Thay đổi trạng thái ca'
  )
}

// Open modal for creating new
const openCreateModal = () => {
  isEditMode.value = false
  currentShift.value = {
    id: null,
    ma: '', // Handled by backend
    ten: '',
    gioBatDau: '',
    gioKetThuc: '',
    trangThai: 1
  }
  errors.value = { ten: '', gioBatDau: '', gioKetThuc: '' }
  showModal.value = true
}

// Open modal for editing
const openEditModal = (shift) => {
  isEditMode.value = true
  currentShift.value = { ...shift }
  errors.value = { ten: '', gioBatDau: '', gioKetThuc: '' }
  showModal.value = true
}

// Close modal
const closeModal = () => {
  showModal.value = false
}

// Save shift (create or edit)
const saveShift = async () => {
  // Validate fields
  let isValid = true
  errors.value = { ten: '', gioBatDau: '', gioKetThuc: '' }

  if (!currentShift.value.ten.trim()) {
    errors.value.ten = 'Tên ca không được để trống'
    isValid = false
  }

  if (!currentShift.value.gioBatDau) {
    errors.value.gioBatDau = 'Giờ bắt đầu không được để trống'
    isValid = false
  }

  if (!currentShift.value.gioKetThuc) {
    errors.value.gioKetThuc = 'Giờ kết thúc không được để trống'
    isValid = false
  }

  if (!isValid) return

  const payload = {
    ma: currentShift.value.ma || null,
    ten: currentShift.value.ten.trim(),
    gioBatDau: currentShift.value.gioBatDau,
    gioKetThuc: currentShift.value.gioKetThuc,
    trangThai: currentShift.value.trangThai
  }

  if (isEditMode.value) {
    // Update
    try {
      await api.put(`/api/v1/ca-lam-viec/${currentShift.value.id}`, payload)
      showToast('Cập nhật ca làm việc thành công!', 'success')
      await fetchShifts()
      closeModal()
    } catch (e) {
      console.error('Server error on update', e)
      showToast(e.response?.data?.message || 'Có lỗi xảy ra khi cập nhật ca làm việc', 'error')
    }
  } else {
    // Create
    try {
      await api.post('/api/v1/ca-lam-viec', payload)
      showToast('Thêm mới ca làm việc thành công!', 'success')
      await fetchShifts()
      closeModal()
    } catch (e) {
      console.error('Server error on create', e)
      showToast(e.response?.data?.message || 'Có lỗi xảy ra khi thêm ca làm việc', 'error')
    }
  }
}

// Clear filters
const clearFilters = () => {
  searchQuery.value = ''
  startTimeFilter.value = ''
  endTimeFilter.value = ''
  statusFilter.value = 'all'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header Page title -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-[#0D2533]">Quản Lý Ca Làm Việc</h1>
        <p class="text-sm text-gray-500 mt-1">Quản lý danh mục và lịch trình các ca trực của nhân viên cửa hàng.</p>
      </div>
    </div>

    <!-- Search and Filter Container -->
    <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-[#0D2533] flex items-center gap-2">
          <span class="material-symbols-outlined text-gray-400">filter_alt</span>
          Bộ lọc tìm kiếm
        </h3>
        <button 
          @click="clearFilters" 
          class="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          style="color: #EF972D;"
        >
          <span class="material-symbols-outlined text-[14px]">restart_alt</span> Xóa bộ lọc
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Search query -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tìm kiếm chung</label>
          <div class="relative flex items-center">
            <span class="material-symbols-outlined absolute left-3 text-gray-400 text-lg">search</span>
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Nhập tên ca, mã ca..." 
              class="w-full pl-10 pr-4 py-2 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border border-gray-200 focus:border-[#EF972D] focus:ring-1 focus:ring-[#EF972D] rounded-xl outline-none text-sm transition-all"
            />
          </div>
        </div>

        <!-- Start Time -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Thời gian bắt đầu từ</label>
          <div class="relative flex items-center">
            <span class="material-symbols-outlined absolute left-3 text-gray-400 text-lg">schedule</span>
            <input 
              v-model="startTimeFilter" 
              type="time" 
              class="w-full pl-10 pr-4 py-2 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border border-gray-200 focus:border-[#EF972D] focus:ring-1 focus:ring-[#EF972D] rounded-xl outline-none text-sm transition-all"
            />
          </div>
        </div>

        <!-- End Time -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Thời gian kết thúc đến</label>
          <div class="relative flex items-center">
            <span class="material-symbols-outlined absolute left-3 text-gray-400 text-lg">schedule</span>
            <input 
              v-model="endTimeFilter" 
              type="time" 
              class="w-full pl-10 pr-4 py-2 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border border-gray-200 focus:border-[#EF972D] focus:ring-1 focus:ring-[#EF972D] rounded-xl outline-none text-sm transition-all"
            />
          </div>
        </div>

        <!-- Status -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</label>
          <div class="flex items-center gap-4 h-full py-1">
            <label class="flex items-center gap-1.5 text-sm font-medium text-gray-700 cursor-pointer">
              <input 
                type="radio" 
                value="all" 
                v-model="statusFilter" 
                class="w-4 h-4 text-primary focus:ring-[#EF972D] border-gray-300"
                style="accent-color: #EF972D;"
              />
              Tất cả
            </label>
            <label class="flex items-center gap-1.5 text-sm font-medium text-gray-700 cursor-pointer">
              <input 
                type="radio" 
                value="active" 
                v-model="statusFilter" 
                class="w-4 h-4 text-primary focus:ring-[#EF972D] border-gray-300"
                style="accent-color: #EF972D;"
              />
              Hoạt động
            </label>
            <label class="flex items-center gap-1.5 text-sm font-medium text-gray-700 cursor-pointer">
              <input 
                type="radio" 
                value="inactive" 
                v-model="statusFilter" 
                class="w-4 h-4 text-primary focus:ring-[#EF972D] border-gray-300"
                style="accent-color: #EF972D;"
              />
              Ngưng
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Shifts List Container -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <!-- Section Header -->
      <div class="p-6 border-b border-gray-50 flex items-center justify-between">
        <h2 class="text-lg font-bold text-[#0D2533]">Danh sách Ca làm việc</h2>
        <div class="flex items-center gap-3">
          <!-- Refresh -->
          <button 
            @click="fetchShifts" 
            class="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-500 cursor-pointer transition-colors flex items-center justify-center"
            title="Làm mới"
          >
            <span class="material-symbols-outlined text-[20px]">refresh</span>
          </button>
          <!-- Add Button -->
          <button 
            @click="openCreateModal" 
            class="bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white p-2.5 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer font-bold text-sm"
          >
            <span class="material-symbols-outlined text-[20px]">add</span>
            Thêm ca làm việc
          </button>
        </div>
      </div>

      <!-- Table Content -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left">
          <thead>
            <tr class="bg-gray-50/70 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <th class="py-4 px-6 text-center w-16">STT</th>
              <th class="py-4 px-6">Thông tin Ca</th>
              <th class="py-4 px-6">Giờ bắt đầu</th>
              <th class="py-4 px-6">Giờ kết thúc</th>
              <th class="py-4 px-6 text-center w-40">Giao ca hôm nay</th>
              <th class="py-4 px-6 text-center w-32">Trạng thái</th>
              <th class="py-4 px-6 text-center w-28">Thao tác</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 text-sm">
            <tr v-if="loading" class="text-center">
              <td colspan="7" class="py-10 text-gray-400">
                <div class="flex items-center justify-center gap-2">
                  <div class="animate-spin rounded-full h-5 w-5 border-2 border-t-transparent border-[#EF972D]"></div>
                  Đang tải dữ liệu...
                </div>
              </td>
            </tr>
            <tr v-else-if="filteredShifts.length === 0" class="text-center">
              <td colspan="7" class="py-10 text-gray-400">Không tìm thấy ca làm việc nào phù hợp.</td>
            </tr>
            <tr v-else v-for="(shift, index) in filteredShifts" :key="shift.id" class="hover:bg-gray-50/50 transition-colors">
              <!-- STT -->
              <td class="py-4 px-6 text-center font-medium text-gray-500">{{ index + 1 }}</td>
              <!-- Info -->
              <td class="py-4 px-6">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-orange-50 text-[#EF972D] flex items-center justify-center flex-shrink-0">
                    <span class="material-symbols-outlined">schedule</span>
                  </div>
                  <div>
                    <h4 class="font-bold text-[#0D2533] text-sm">{{ shift.ten }}</h4>
                    <span class="text-xs text-gray-400 font-mono">{{ shift.ma }}</span>
                  </div>
                </div>
              </td>
              <!-- Start Time -->
              <td class="py-4 px-6">
                <span class="px-2.5 py-1 text-xs font-bold bg-[#E8F5E9] text-[#2E7D32] rounded-full">
                  {{ shift.gioBatDau ? shift.gioBatDau.substring(0, 5) : '' }}
                </span>
              </td>
              <!-- End Time -->
              <td class="py-4 px-6">
                <span class="px-2.5 py-1 text-xs font-bold bg-[#FFEBEE] text-[#C62828] rounded-full">
                  {{ shift.gioKetThuc ? shift.gioKetThuc.substring(0, 5) : '' }}
                </span>
              </td>
              <!-- Today's shift handover status -->
              <td class="py-4 px-6 text-center">
                <span 
                  v-if="getTodayGiaoCaStatus(shift) === 'DANG_MO'"
                  class="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/50 rounded-full inline-flex items-center gap-1.5"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Đang mở
                </span>
                <span 
                  v-else-if="getTodayGiaoCaStatus(shift) === 'DA_DONG'"
                  class="px-2.5 py-1 text-xs font-bold bg-gray-50 text-gray-500 border border-gray-200 rounded-full inline-flex items-center gap-1.5"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                  Đã đóng
                </span>
                <span 
                  v-else
                  class="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200/50 rounded-full inline-flex items-center gap-1.5"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  Chưa mở
                </span>
              </td>

              <!-- Status Toggle -->
              <td class="py-4 px-6 text-center">
                <button 
                  @click="toggleStatus(shift)"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer outline-none border-none"
                  :class="shift.trangThai === 1 ? 'bg-[#4CAF50]' : 'bg-gray-200'"
                >
                  <span 
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
                    :class="shift.trangThai === 1 ? 'translate-x-6' : 'translate-x-1'"
                  ></span>
                </button>
              </td>
              <!-- Action -->
              <td class="py-4 px-6 text-center">
                <button 
                  @click="openEditModal(shift)" 
                  class="p-2 text-gray-400 hover:text-[#EF972D] hover:bg-orange-50 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-orange-100"
                  title="Chỉnh sửa ca"
                >
                  <span class="material-symbols-outlined text-[20px]">visibility</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Shift Modal -->
    <div 
      v-if="showModal" 
      class="fixed inset-0 bg-[#0D2533]/40 flex items-center justify-center z-50 p-4 transition-all duration-300"
    >
      <div 
        class="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden transform scale-100 transition-all duration-300"
      >
        <!-- Modal Header -->
        <div class="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <h3 class="text-lg font-bold text-[#0D2533] flex items-center gap-2">
            <span class="material-symbols-outlined text-[#EF972D]">schedule</span>
            {{ isEditMode ? 'Chỉnh Sửa Ca Làm Việc' : 'Thêm Mới Ca Làm Việc' }}
          </h3>
          <button 
            @click="closeModal" 
            class="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 space-y-4">
          <!-- Code -->
          <div class="flex flex-col gap-1.5" v-if="isEditMode">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Mã ca</label>
            <input 
              :value="currentShift.ma" 
              disabled 
              type="text" 
              class="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-xl outline-none text-sm text-gray-500 font-mono"
            />
          </div>

          <!-- Name -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Tên ca <span class="text-red-500">*</span></label>
            <input 
              v-model="currentShift.ten" 
              type="text" 
              placeholder="Ví dụ: Ca sáng, Ca chiều..." 
              class="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border focus:border-[#EF972D] focus:ring-1 focus:ring-[#EF972D] rounded-xl outline-none text-sm transition-all"
              :class="errors.ten ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-200'"
            />
            <span v-if="errors.ten" class="text-xs text-red-500 font-semibold">{{ errors.ten }}</span>
          </div>

          <!-- Hours block -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Start hour -->
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Giờ bắt đầu <span class="text-red-500">*</span></label>
              <input 
                v-model="currentShift.gioBatDau" 
                type="time" 
                class="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border focus:border-[#EF972D] focus:ring-1 focus:ring-[#EF972D] rounded-xl outline-none text-sm transition-all"
                :class="errors.gioBatDau ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-200'"
              />
              <span v-if="errors.gioBatDau" class="text-xs text-red-500 font-semibold">{{ errors.gioBatDau }}</span>
            </div>

            <!-- End hour -->
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Giờ kết thúc <span class="text-red-500">*</span></label>
              <input 
                v-model="currentShift.gioKetThuc" 
                type="time" 
                class="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border focus:border-[#EF972D] focus:ring-1 focus:ring-[#EF972D] rounded-xl outline-none text-sm transition-all"
                :class="errors.gioKetThuc ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-200'"
              />
              <span v-if="errors.gioKetThuc" class="text-xs text-red-500 font-semibold">{{ errors.gioKetThuc }}</span>
            </div>
          </div>

          <!-- Status toggle -->
          <div class="flex items-center justify-between py-2 border-t border-gray-50 mt-4">
            <span class="text-sm font-semibold text-gray-600">Kích hoạt ca làm việc này</span>
            <button 
              @click="currentShift.trangThai = currentShift.trangThai === 1 ? 0 : 1"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer outline-none border-none"
              :class="currentShift.trangThai === 1 ? 'bg-[#4CAF50]' : 'bg-gray-200'"
            >
              <span 
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
                :class="currentShift.trangThai === 1 ? 'translate-x-6' : 'translate-x-1'"
              ></span>
            </button>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="p-6 border-t border-gray-50 flex items-center justify-end gap-3 bg-gray-50/50">
          <button 
            @click="closeModal" 
            class="px-4 py-2 border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button 
            @click="saveShift" 
            class="px-5 py-2 bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white rounded-xl shadow-md hover:shadow-lg font-bold text-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            Lưu ca
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
      <div class="p-6 text-sm text-gray-600 leading-relaxed">
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
    <span class="text-sm font-semibold">{{ toast.message }}</span>
    <button @click="toast.show = false" class="ml-4 text-gray-400 hover:text-gray-600 cursor-pointer">
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
</style>

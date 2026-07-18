<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../services/api'
import { sortNewestAtTop } from '@/utils/format'

const router = useRouter()

// Mock Fallback Database
const defaultMockRoles = [
  { id: 1, ma: 'ADMIN', ten: 'Quản lý' },
  { id: 2, ma: 'STAFF', ten: 'Nhân viên bán hàng' },
  { id: 3, ma: 'CASHIER', ten: 'Kế toán' },
  { id: 4, ma: 'STOCK', ten: 'Nhân viên kho' }
]

const defaultMockEmployees = [
  { 
    id: 1, 
    anh: '', 
    maNhanVien: 'NV001', 
    hoVaTen: 'Trần Tuấn Linh', 
    email: 'linhtt@beestylish.com', 
    soDienThoai: '0987654321', 
    diaChi: '123 Nguyễn Văn Linh, Quận 7, TP.HCM', 
    tenVaiTro: 'Quản lý',
    idVaiTro: 1,
    trangThai: 1,
    cccd: '001098765432',
    gioiTinh: 1,
    ngaySinh: '1995-04-12'
  },
  { 
    id: 2, 
    anh: '', 
    maNhanVien: 'NV002', 
    hoVaTen: 'Nguyễn Thị Hương', 
    email: 'huongnt@beestylish.com', 
    soDienThoai: '0912345678', 
    diaChi: '45 Lê Lợi, Quận 1, TP.HCM', 
    tenVaiTro: 'Nhân viên bán hàng',
    idVaiTro: 2,
    trangThai: 1,
    cccd: '001098765433',
    gioiTinh: 0,
    ngaySinh: '1998-05-12'
  },
  { 
    id: 3, 
    anh: '', 
    maNhanVien: 'NV003', 
    hoVaTen: 'Lê Văn Minh', 
    email: 'minhlv@beestylish.com', 
    soDienThoai: '0933445566', 
    diaChi: '89 Trần Hưng Đạo, Quận 5, TP.HCM', 
    tenVaiTro: 'Kế toán',
    idVaiTro: 3,
    trangThai: 1,
    cccd: '001098765434',
    gioiTinh: 1,
    ngaySinh: '1992-10-05'
  },
  { 
    id: 4, 
    anh: '', 
    maNhanVien: 'NV004', 
    hoVaTen: 'Phạm Văn Đức', 
    email: 'ducpv@beestylish.com', 
    soDienThoai: '0977889900', 
    diaChi: '22 Tôn Đức Thắng, Quận 1, TP.HCM', 
    tenVaiTro: 'Nhân viên kho',
    idVaiTro: 4,
    trangThai: 0,
    cccd: '001098765435',
    gioiTinh: 1,
    ngaySinh: '1997-08-25'
  }
]

// LocalStorage helpers
const getMockDB = () => {
  const db = localStorage.getItem('mock_employees')
  if (!db) {
    localStorage.setItem('mock_employees', JSON.stringify(defaultMockEmployees))
    return defaultMockEmployees
  }
  return JSON.parse(db)
}

const setMockDB = (data) => {
  localStorage.setItem('mock_employees', JSON.stringify(data))
}

// State variables
const employees = ref([])
const roles = ref([])
const isUsingMock = ref(false)
const isLoading = ref(false)

// Filter states
const searchQuery = ref('')
const selectedStatus = ref('all')

// Pagination states
const currentPage = ref(0)
const totalPages = ref(1)
const totalElements = ref(0)
const pageSize = ref(10)

// Toast notifications
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

// Confirmation modals
const confirmModal = ref({ show: false, title: '', message: '', onConfirm: null })
const triggerConfirm = (message, onConfirm, title = 'Xác nhận hành động') => {
  confirmModal.value = { show: true, title, message, onConfirm }
}
const handleConfirm = async () => {
  const cb = confirmModal.value.onConfirm
  confirmModal.value.show = false
  if (cb) await cb()
}

// Add/Edit Modal state
const showModal = ref(false)
const isEditModal = ref(false)
const fileInput = ref(null)
const modalForm = ref({
  id: null,
  maNhanVien: '',
  hoVaTen: '',
  idVaiTro: '',
  email: '',
  soDienThoai: '',
  cccd: '',
  gioiTinh: 1,
  ngaySinh: '',
  diaChi: '',
  anh: '',
  anhLocal: '',
  imageFile: null
})

// Helper to resolve Image paths from Backend
const getImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
}

// Helper to extract initials for avatar placeholder
const getInitials = (name) => {
  if (!name) return ''
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[words.length - 2][0] + words[words.length - 1][0]).toUpperCase()
  }
  return words[0] ? words[0][0].toUpperCase() : ''
}

// Fetch list of roles
const fetchRoles = async () => {
  try {
    const res = await api.get('/api/v1/vai-tro')
    roles.value = res.data || []
  } catch (err) {
    console.warn('Failed to load roles from API, using default mock roles:', err.message)
    roles.value = defaultMockRoles
  }
}

// Main fetcher for employees list
const fetchEmployees = async (page = 0) => {
  isLoading.value = true
  currentPage.value = page

  try {
    const params = {
      page: page,
      size: pageSize.value
    }
    if (searchQuery.value.trim()) {
      params.keyword = searchQuery.value.trim()
    }
    if (selectedStatus.value !== 'all') {
      params.trangThai = selectedStatus.value === 'active' ? 1 : 0
    }

    const res = await api.get('/api/v1/nhan-vien', { params })
    const data = res.data
    if (data) {
      employees.value = sortNewestAtTop('employee', data.content || [])
      totalPages.value = data.totalPages || 1
      totalElements.value = data.totalElements || 0
      isUsingMock.value = false
    } else {
      throw new Error('Null response content')
    }
  } catch (err) {
    console.warn('API employees load failed, switching to local mock database:', err.message)
    isUsingMock.value = true

    // Local filter and page mock logic
    let list = getMockDB()
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      list = list.filter(e => 
        e.hoVaTen.toLowerCase().includes(q) ||
        e.maNhanVien.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.soDienThoai.includes(q)
      )
    }
    if (selectedStatus.value !== 'all') {
      const activeVal = selectedStatus.value === 'active' ? 1 : 0
      list = list.filter(e => e.trangThai === activeVal)
    }

    totalElements.value = list.length
    totalPages.value = Math.ceil(list.length / pageSize.value) || 1
    const startIdx = page * pageSize.value
    employees.value = sortNewestAtTop('employee', list.slice(startIdx, startIdx + pageSize.value))
  } finally {
    isLoading.value = false
  }
}

// Watchers for filtering and pagination
watch(selectedStatus, () => fetchEmployees(0))

let searchTimeout = null
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchEmployees(0)
  }, 400)
})

const resetFilters = () => {
  searchQuery.value = ''
  selectedStatus.value = 'all'
  fetchEmployees(0)
}

// Toggle status switch
const handleToggle = (item) => {
  const nextStatus = item.trangThai === 1 ? 0 : 1
  const actionText = nextStatus === 1 ? 'kích hoạt lại (Đang làm)' : 'ngừng kích hoạt (Đã nghỉ)'

  triggerConfirm(
    `Bạn có chắc muốn ${actionText} trạng thái làm việc của nhân viên "${item.hoVaTen}"?`,
    async () => {
      if (isUsingMock.value) {
        const db = getMockDB()
        const target = db.find(e => e.id === item.id)
        if (target) {
          target.trangThai = nextStatus
          setMockDB(db)
        }
        showToast('Cập nhật trạng thái thành công (Mock)!', 'success')
        await fetchEmployees(currentPage.value)
      } else {
        try {
          const res = await api.patch(`/api/v1/nhan-vien/${item.id}/status`)
          if (res._wrapper && res._wrapper.status && res._wrapper.status.includes('ERROR')) {
            showToast(`Lỗi: ${res._wrapper.message}`, 'error')
          } else {
            showToast('Cập nhật trạng thái thành công!', 'success')
            await fetchEmployees(currentPage.value)
          }
        } catch (err) {
          console.error(err)
          showToast('Không thể cập nhật trạng thái. Vui lòng thử lại!', 'error')
        }
      }
    },
    'Thay đổi trạng thái nhân viên'
  )
}

// Export excel
const exportExcel = async () => {
  showToast('Đang tạo và tải file Excel...', 'info')
  if (isUsingMock.value) {
    setTimeout(() => {
      showToast('Xuất Excel thành công (Mock)!', 'success')
    }, 1500)
  } else {
    try {
      const response = await api.get('/api/v1/nhan-vien/export-excel', {
        params: {
          keyword: searchQuery.value.trim(),
          trangThai: selectedStatus.value === 'all' ? null : (selectedStatus.value === 'active' ? 1 : 0)
        },
        responseType: 'blob'
      })
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = `Danh_Sach_Nhan_Vien_${new Date().toISOString().slice(0, 10)}.xlsx`
      link.click()
      showToast('Xuất Excel thành công!', 'success')
    } catch (err) {
      console.error(err)
      showToast('Không xuất được file Excel. Vui lòng thử lại!', 'error')
    }
  }
}

// Open view for Adding a new Employee
const openAddModal = () => {
  router.push('/employees/create')
}

// Open view for Editing Employee
const openEditModal = (item) => {
  router.push(`/employees/edit/${item.id}`)
}

// Local preview trigger for avatar upload
const triggerImageInput = () => {
  fileInput.value.click()
}

// Capture local image file
const handleImageChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  modalForm.value.anhLocal = URL.createObjectURL(file)
  modalForm.value.imageFile = file
}

// Save employee action
const saveEmployee = async () => {
  const f = modalForm.value
  if (!f.hoVaTen || !f.email || !f.soDienThoai || !f.idVaiTro) {
    showToast('Vui lòng nhập đầy đủ các thông tin bắt buộc!', 'error')
    return
  }

  // Regex validations
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(f.email)) {
    showToast('Email không đúng định dạng!', 'error')
    return
  }
  const phoneRegex = /^(0[3|5|7|8|9])([0-9]{8})$/
  if (!phoneRegex.test(f.soDienThoai)) {
    showToast('Số điện thoại không hợp lệ (VD: 0912345678)!', 'error')
    return
  }

  triggerConfirm(
    `Bạn có chắc chắn muốn lưu thông tin nhân viên "${f.hoVaTen}" không?`,
    async () => {
      // 1. Handle file upload if a new image file is chosen
      let finalImageUrl = f.anh
      if (f.imageFile) {
        try {
          const formData = new FormData()
          formData.append('file', f.imageFile)
          const uploadRes = await api.post('/api/v1/images/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          if (uploadRes.data) {
            finalImageUrl = uploadRes.data
          }
        } catch (err) {
          console.error('Image upload failed:', err)
          showToast('Lỗi khi tải ảnh đại diện lên server, vẫn tiếp tục lưu thông tin.', 'warning')
        }
      }

      // 2. Prepare payload matching NhanVienUpdateRequest DTO
      const payload = {
        idVaiTro: Number(f.idVaiTro),
        hoVaTen: f.hoVaTen,
        soDienThoai: f.soDienThoai,
        email: f.email,
        cccd: f.cccd || '',
        gioiTinh: Number(f.gioiTinh),
        ngaySinh: f.ngaySinh || null,
        diaChi: f.diaChi || '',
        anh: finalImageUrl
      }

      if (isUsingMock.value) {
        const db = getMockDB()
        const selectedRoleObj = roles.value.find(r => r.id === Number(f.idVaiTro))
        const roleName = selectedRoleObj ? selectedRoleObj.ten : 'Nhân viên bán hàng'

        if (isEditModal.value) {
          const idx = db.findIndex(e => e.id === f.id)
          if (idx !== -1) {
            db[idx] = {
              ...db[idx],
              hoVaTen: f.hoVaTen,
              idVaiTro: Number(f.idVaiTro),
              tenVaiTro: roleName,
              email: f.email,
              soDienThoai: f.soDienThoai,
              cccd: f.cccd,
              gioiTinh: Number(f.gioiTinh),
              ngaySinh: f.ngaySinh,
              diaChi: f.diaChi,
              anh: f.anhLocal // mock URL preview
            }
          }
          showToast('Cập nhật nhân viên thành công (Mock)!', 'success')
        } else {
          const newId = db.length ? Math.max(...db.map(e => e.id)) + 1 : 1
          db.push({
            id: newId,
            maNhanVien: f.maNhanVien,
            hoVaTen: f.hoVaTen,
            idVaiTro: Number(f.idVaiTro),
            tenVaiTro: roleName,
            email: f.email,
            soDienThoai: f.soDienThoai,
            cccd: f.cccd,
            gioiTinh: Number(f.gioiTinh),
            ngaySinh: f.ngaySinh,
            diaChi: f.diaChi,
            anh: f.anhLocal,
            trangThai: 1
          })
          showToast('Thêm mới nhân viên thành công (Mock)!', 'success')
        }
        setMockDB(db)
        showModal.value = false
        await fetchEmployees(currentPage.value)
      } else {
        try {
          if (isEditModal.value) {
            const res = await api.put(`/api/v1/nhan-vien/${f.id}`, payload)
            if (res._wrapper && res._wrapper.status && res._wrapper.status.includes('ERROR')) {
              showToast(`Lỗi: ${res._wrapper.message}`, 'error')
            } else {
              showToast('Cập nhật nhân viên thành công!', 'success')
              showModal.value = false
              await fetchEmployees(currentPage.value)
            }
          } else {
            const res = await api.post('/api/v1/nhan-vien', payload)
            if (res._wrapper && res._wrapper.status && res._wrapper.status.includes('ERROR')) {
              showToast(`Lỗi: ${res._wrapper.message}`, 'error')
            } else {
              showToast('Thêm mới nhân viên thành công!', 'success')
              showModal.value = false
              await fetchEmployees(0)
            }
          }
        } catch (err) {
          console.error(err)
          const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin!'
          showToast(errorMsg, 'error')
        }
      }
    },
    'Lưu thông tin nhân viên'
  )
}

// Compute visible pages array
const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 5
  if (totalPages.value <= maxVisible) {
    for (let i = 0; i < totalPages.value; i++) pages.push(i)
  } else {
    if (currentPage.value < 3) {
      for (let i = 0; i < 4; i++) pages.push(i)
      pages.push('...')
      pages.push(totalPages.value - 1)
    } else if (currentPage.value > totalPages.value - 4) {
      pages.push(0)
      pages.push('...')
      for (let i = totalPages.value - 4; i < totalPages.value; i++) pages.push(i)
    } else {
      pages.push(0)
      pages.push('...')
      pages.push(currentPage.value - 1)
      pages.push(currentPage.value)
      pages.push(currentPage.value + 1)
      pages.push('...')
      pages.push(totalPages.value - 1)
    }
  }
  return pages
})

onMounted(async () => {
  await fetchRoles()
  await fetchEmployees(0)
})
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Breadcrumb Title -->
    <h1 class="font-headline-md text-headline-md text-inverse-surface mb-stack-lg font-bold uppercase">
      QUẢN LÝ NHÂN VIÊN
    </h1>

    <!-- Filter & Actions Bar -->
    <section class="bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant/30 p-gutter flex flex-col md:flex-row justify-between items-center gap-gutter">
      <div class="flex flex-wrap gap-stack-md flex-1 w-full">
        <!-- Search Input -->
        <div class="relative w-full md:w-64">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" style="font-size: 20px;">search</span>
          <input 
            v-model="searchQuery"
            class="w-full pl-10 pr-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container font-body-md text-body-md placeholder-on-surface-variant transition-all" 
            placeholder="Tìm theo tên, mã, email, sđt" 
            type="text"
          />
        </div>

        <!-- Status Filter -->
        <div class="relative">
          <select 
            v-model="selectedStatus"
            class="appearance-none border border-outline-variant rounded-lg bg-surface-container-lowest py-2 pl-3 pr-10 focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container font-body-md text-body-md text-on-surface-variant cursor-pointer transition-all"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang làm</option>
            <option value="inactive">Đã nghỉ</option>
          </select>
          <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" style="font-size: 20px;">expand_more</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-stack-md w-full md:w-auto justify-end mt-4 md:mt-0">
        <!-- Reset Filters -->
        <button 
          @click="resetFilters"
          class="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface-container-low transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">restart_alt</span>
          Làm mới
        </button>

        <!-- Export Excel -->
        <button 
          @click="exportExcel"
          class="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface-container-low transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">download</span>
          Xuất Excel
        </button>

        <!-- Add Employee -->
        <button 
          @click="openAddModal"
          class="px-4 py-2 bg-primary-container text-on-primary rounded-lg font-label-sm text-label-sm hover:bg-primary transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <span class="material-symbols-outlined text-[16px]">add</span>
          Thêm nhân viên
        </button>
      </div>
    </section>

    <!-- Data Table Section -->
    <section class="bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col min-h-[400px]">
      <div v-if="isLoading" class="p-10 flex flex-col items-center justify-center gap-3 flex-1">
        <div class="w-8 h-8 border-4 border-primary-container border-t-transparent rounded-full animate-spin"></div>
        <span class="text-sm font-semibold text-on-surface-variant">Đang tải danh sách nhân viên...</span>
      </div>

      <div v-else-if="employees.length === 0" class="p-10 text-center flex-1 flex flex-col items-center justify-center gap-2">
        <span class="material-symbols-outlined text-gray-400 text-5xl">search_off</span>
        <p class="text-sm text-gray-500 font-medium">Không tìm thấy nhân viên nào phù hợp.</p>
      </div>

      <div v-else class="overflow-x-auto flex-1">
        <table class="w-full text-left border-collapse">
          <thead class="bg-surface border-b border-outline-variant sticky top-0">
            <tr>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap text-center w-16">STT</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap text-center w-20">Ảnh</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap w-24">MÃ NV</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap">HỌ TÊN</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap">EMAIL</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap w-32">SĐT</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap">ĐỊA CHỈ</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap w-36">CHỨC VỤ</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap w-32">TRẠNG THÁI</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap text-center w-28">THAO TÁC</th>
            </tr>
          </thead>
          <tbody class="font-body-md text-body-md divide-y divide-outline-variant/20">
            <tr 
              v-for="(item, index) in employees" 
              :key="item.id"
              class="hover:bg-surface-container-low transition-colors"
              :class="item.trangThai === 0 ? 'opacity-75 bg-gray-50/50' : ''"
            >
              <td class="py-3 px-4 text-center text-on-surface-variant">
                {{ index + 1 + currentPage * pageSize }}
              </td>
              <td class="py-3 px-4 flex justify-center">
                <!-- Avatar image or fallbacks to name initials -->
                <img 
                  v-if="item.anh" 
                  :src="getImageUrl(item.anh)" 
                  alt="Avatar"
                  class="w-10 h-10 rounded-full object-cover border border-outline-variant"
                />
                <div 
                  v-else 
                  class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                  :class="[
                    index % 4 === 0 ? 'bg-blue-100 text-blue-700' : 
                    index % 4 === 1 ? 'bg-purple-100 text-purple-700' : 
                    index % 4 === 2 ? 'bg-pink-100 text-pink-700' : 
                    'bg-amber-100 text-amber-700'
                  ]"
                >
                  {{ getInitials(item.hoVaTen) }}
                </div>
              </td>
              <td class="py-3 px-4 font-bold text-on-surface whitespace-nowrap">{{ item.maNhanVien }}</td>
              <td class="py-3 px-4 font-semibold text-on-surface whitespace-nowrap">{{ item.hoVaTen }}</td>
              <td class="py-3 px-4 text-on-surface-variant whitespace-nowrap">{{ item.email }}</td>
              <td class="py-3 px-4 text-on-surface-variant whitespace-nowrap">{{ item.soDienThoai }}</td>
              <td 
                class="py-3 px-4 truncate max-w-[150px] text-on-surface-variant"
                :title="item.diaChi || 'Chưa cập nhật địa chỉ'"
              >
                {{ item.diaChi || 'Chưa cập nhật' }}
              </td>
              <td class="py-3 px-4 text-on-surface font-medium whitespace-nowrap">
                {{ item.tenVaiTro || 'Nhân viên bán hàng' }}
              </td>
              <td class="py-3 px-4">
                <span 
                  v-if="item.trangThai === 1"
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DEF7EC] text-[#03543F]"
                >
                  Đang làm
                </span>
                <span 
                  v-else
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-variant text-on-surface-variant border border-outline-variant/30"
                >
                  Đã nghỉ
                </span>
              </td>
              <td class="py-3 px-4">
                <div class="flex items-center justify-center gap-3">
                  <!-- Status Toggle Switch -->
                  <button
                    @click="handleToggle(item)"
                    :aria-checked="item.trangThai === 1 ? 'true' : 'false'"
                    :class="item.trangThai === 1 ? 'bg-primary-container' : 'bg-outline-variant'"
                    class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer"
                    role="switch"
                    title="Đổi trạng thái"
                  >
                    <span
                      :class="item.trangThai === 1 ? 'translate-x-5' : 'translate-x-1'"
                      class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform"
                    ></span>
                  </button>

                  <!-- Edit Details Button -->
                  <button 
                    @click="openEditModal(item)"
                    class="text-secondary hover:text-inverse-surface transition-colors cursor-pointer"
                    title="Chỉnh sửa nhân viên"
                  >
                    <span class="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Card Footer -->
      <div class="p-gutter border-t border-outline-variant bg-surface-container-lowest flex flex-col sm:flex-row justify-between items-center gap-4" v-if="employees.length > 0">
        <!-- Counter and limit dropdown -->
        <div class="flex flex-wrap items-center gap-4 text-sm font-semibold text-on-surface-variant font-body-md">
          <span>
            Hiển thị {{ Math.min(currentPage * pageSize + 1, totalElements) }} - {{ Math.min((currentPage + 1) * pageSize, totalElements) }} trên tổng số {{ totalElements }} nhân viên
          </span>
          <div class="flex items-center gap-2">
            <span>Hiển thị</span>
            <select 
              v-model="pageSize" 
              @change="fetchEmployees(0)" 
              class="border border-outline-variant rounded px-2 py-1 bg-surface-container-lowest text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-container"
            >
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
            </select>
            <span>dòng</span>
          </div>
        </div>

        <!-- Pagination Links -->
        <nav class="flex items-center gap-1" v-if="totalPages > 1">
          <button 
            @click="fetchEmployees(currentPage - 1)"
            :disabled="currentPage === 0"
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span class="material-symbols-outlined text-[16px]">chevron_left</span>
          </button>
          
          <button 
            v-for="(page, idx) in visiblePages"
            :key="idx"
            @click="page !== '...' && fetchEmployees(page)"
            :class="page === currentPage ? 'bg-primary-container text-on-primary font-bold shadow-sm' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-low hover:text-primary-container cursor-pointer'"
            class="w-8 h-8 flex items-center justify-center rounded-lg font-body-md text-body-md transition-colors"
            :disabled="page === '...'"
          >
            {{ page === '...' ? '...' : page + 1 }}
          </button>

          <button 
            @click="fetchEmployees(currentPage + 1)"
            :disabled="currentPage === totalPages - 1"
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span class="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </nav>
      </div>
    </section>
  </div>



  <!-- Confirmation Dialog Modal -->
  <div v-if="confirmModal.show" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl max-w-md w-full overflow-hidden border border-gray-100 shadow-2xl animate-fade-in">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
        <span class="material-symbols-outlined text-amber-500 text-2xl">warning</span>
        <h3 class="font-headline-md text-base font-bold text-gray-800 leading-tight">
          {{ confirmModal.title }}
        </h3>
      </div>
      <div class="p-6 text-sm text-gray-600 leading-relaxed">
        {{ confirmModal.message }}
      </div>
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
        <button 
          type="button" 
          @click="confirmModal.show = false"
          class="border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
        >
          Hủy bỏ
        </button>
        <button 
          type="button" 
          @click="handleConfirm"
          class="bg-primary-container hover:bg-primary text-white px-4 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer shadow-sm"
        >
          Xác nhận
        </button>
      </div>
    </div>
  </div>

  <!-- Custom Toast Notification -->
  <div 
    v-if="toast.show" 
    class="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border transition-all duration-300 transform translate-y-0"
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

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(134, 116, 99, 0.15);
  border-radius: 9999px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgba(134, 116, 99, 0.3);
}
</style>

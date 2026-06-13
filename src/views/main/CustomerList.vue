<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../services/api'

const router = useRouter()

// Initial Mock Data Fallback
const defaultMockCustomers = [
  { 
    id: 1, 
    maKhachHang: 'KH1777010932628', 
    hoTen: 'fwefgew', 
    tenTaiKhoan: 'fwefgew_acc',
    sdt: '0256423511', 
    email: 'duongductungtn2005@gmail.com', 
    gioiTinh: 1, 
    ngaySinh: '2001-01-20',
    anhDaiDien: '',
    trangThai: 1, 
    diaChiMacDinh: '12, Xã Thèn Phàng, Huyện Xín Mần, Tỉnh Hà Giang', 
    diaChiList: [
      {
        id: 101,
        tenNguoiNhan: 'fwefgew',
        sdtNguoiNhan: '0256423511',
        diaChiCuThe: '12',
        tinhThanhPho: 'Tỉnh Hà Giang',
        quanHuyen: 'Huyện Xín Mần',
        phuongXa: 'Xã Thèn Phàng',
        kieuDiaChiLaMacDinh: true
      }
    ] 
  },
  { 
    id: 2, 
    maKhachHang: 'KH1777010932629', 
    hoTen: 'Trần Thị B', 
    tenTaiKhoan: 'ttb_user',
    sdt: '0987654321', 
    email: 'ttb@example.com', 
    gioiTinh: 0, 
    ngaySinh: '1998-05-12',
    anhDaiDien: '',
    trangThai: 1, 
    diaChiMacDinh: '456 Hai Bà Trưng, Q3, TP.HCM', 
    diaChiList: [
      {
        id: 103,
        tenNguoiNhan: 'Trần Thị B',
        sdtNguoiNhan: '0987654321',
        diaChiCuThe: '456 Hai Bà Trưng',
        tinhThanhPho: 'TP. Hồ Chí Minh',
        quanHuyen: 'Quận 3',
        phuongXa: 'Phường 8',
        kieuDiaChiLaMacDinh: true
      }
    ] 
  }
]

// Location Data from Public open API
const provinces = ref([])
const districts = ref([])
const wards = ref([])

const fetchProvinces = async () => {
  try {
    const res = await fetch('https://provinces.open-api.vn/api/p/')
    const data = await res.json()
    provinces.value = data || []
  } catch (err) {
    console.error('Failed to fetch provinces:', err)
  }
}

const onProvinceChange = async () => {
  districts.value = []
  wards.value = []
  addressModal.value.form.selectedDistrict = ''
  addressModal.value.form.selectedWard = ''

  const pName = addressModal.value.form.selectedProvince
  if (!pName) return

  const provObj = provinces.value.find(p => p.name === pName)
  if (provObj) {
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/p/${provObj.code}?depth=2`)
      const data = await res.json()
      districts.value = data.districts || []
    } catch (err) {
      console.error('Failed to fetch districts:', err)
    }
  }
}

const onDistrictChange = async () => {
  wards.value = []
  addressModal.value.form.selectedWard = ''

  const dName = addressModal.value.form.selectedDistrict
  if (!dName) return

  const distObj = districts.value.find(d => d.name === dName)
  if (distObj) {
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/d/${distObj.code}?depth=2`)
      const data = await res.json()
      wards.value = data.wards || []
    } catch (err) {
      console.error('Failed to fetch wards:', err)
    }
  }
}

// Helper to get/set mock DB
const getMockDB = () => {
  const db = localStorage.getItem('mock_customers')
  if (!db) {
    localStorage.setItem('mock_customers', JSON.stringify(defaultMockCustomers))
    return defaultMockCustomers
  }
  return JSON.parse(db)
}

const setMockDB = (data) => {
  localStorage.setItem('mock_customers', JSON.stringify(data))
}

// Customer state
const customers = ref([])
const isUsingMock = ref(false)

// Filter states
const searchQuery = ref('')
const selectedGender = ref('all')
const selectedStatus = ref('all')

// Pagination & Loading States
const isLoading = ref(false)
const currentPage = ref(0)
const totalPages = ref(1)
const totalElements = ref(0)
const pageSize = ref(10)

// Toast State
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

// Confirmation Modal State
const confirmModal = ref({ show: false, title: '', message: '', onConfirm: null })
const triggerConfirm = (message, onConfirm, title = 'Xác nhận hành động') => {
  confirmModal.value = {
    show: true,
    title,
    message,
    onConfirm
  }
}
const handleConfirm = async () => {
  const cb = confirmModal.value.onConfirm
  confirmModal.value.show = false
  if (cb) {
    await cb()
  }
}

// Address book modal state
const addressModal = ref({
  show: false,
  customer: null,
  addresses: [],
  form: {
    tenNguoiNhan: '',
    sdt: '',
    selectedProvince: '',
    selectedDistrict: '',
    selectedWard: '',
    diaChiCuThe: '',
    isDefault: false
  }
})

// Get formatted address for table list display
const getFullAddressText = (addr) => {
  if (!addr) return ''
  // If it's a combined string already (mock fallback)
  if (addr.diaChiChiTiet) return addr.diaChiChiTiet
  // Backend separate fields format
  return `${addr.diaChiCuThe}, ${addr.phuongXa}, ${addr.quanHuyen}, ${addr.tinhThanhPho}`
}

// Main API fetcher
const fetchCustomers = async (page = 0) => {
  isLoading.value = true
  currentPage.value = page

  try {
    const params = {
      page: page,
      size: pageSize.value,
    }

    if (searchQuery.value.trim()) {
      params.keyword = searchQuery.value.trim()
    }
    if (selectedGender.value !== 'all') {
      params.gioiTinh = selectedGender.value === 'Nam' ? 1 : 0
    }
    if (selectedStatus.value !== 'all') {
      params.trangThai = selectedStatus.value === 'active' ? 1 : 0
    }

    const res = await api.get('/api/v1/khach-hang', { params })
    const data = res.data

    if (data) {
      customers.value = data.content || []
      totalPages.value = data.totalPages || 1
      totalElements.value = data.totalElements || 0
      isUsingMock.value = false
    } else {
      throw new Error('No data received from API')
    }
  } catch (err) {
    console.warn('API fetch failed, falling back to mock data:', err.message)
    isUsingMock.value = true
    
    // Perform frontend filtering over mock data
    let filtered = getMockDB()
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      filtered = filtered.filter(c => 
        c.hoTen.toLowerCase().includes(q) || 
        c.sdt.includes(q) || 
        c.email.toLowerCase().includes(q) ||
        c.maKhachHang.toLowerCase().includes(q)
      )
    }
    if (selectedGender.value !== 'all') {
      const gVal = selectedGender.value === 'Nam' ? 1 : 0
      filtered = filtered.filter(c => c.gioiTinh === gVal)
    }
    if (selectedStatus.value !== 'all') {
      const statusVal = selectedStatus.value === 'active' ? 1 : 0
      filtered = filtered.filter(c => c.trangThai === statusVal)
    }

    // Pagination mock calculation
    totalElements.value = filtered.length
    totalPages.value = Math.ceil(filtered.length / pageSize.value) || 1
    const startIdx = page * pageSize.value
    customers.value = filtered.slice(startIdx, startIdx + pageSize.value)
  } finally {
    isLoading.value = false
  }
}

// Watchers for filtering change
watch(selectedGender, () => fetchCustomers(0))
watch(selectedStatus, () => fetchCustomers(0))

// Debounced live search
let searchTimeout = null
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchCustomers(0)
  }, 400)
})

// Reset filters
const resetFilters = () => {
  searchQuery.value = ''
  selectedGender.value = 'all'
  selectedStatus.value = 'all'
  fetchCustomers(0)
}

// Toggle status switch
const handleToggle = (item) => {
  const oldState = item.trangThai
  const newState = oldState === 1 ? 0 : 1

  triggerConfirm(
    `Bạn có chắc chắn muốn ${newState === 1 ? 'kích hoạt' : 'ngừng kích hoạt'} tài khoản khách hàng "${item.hoTen}" không?`,
    async () => {
      if (isUsingMock.value) {
        // Toggle locally on mock database
        const db = getMockDB()
        const target = db.find(c => c.id === item.id)
        if (target) {
          target.trangThai = newState
          setMockDB(db)
        }
        showToast('Đã thay đổi trạng thái khách hàng thành công (Mock)!', 'success')
        await fetchCustomers(currentPage.value)
      } else {
        try {
          const res = await api.patch(`/api/v1/khach-hang/${item.id}/status`)
          if (res._wrapper && res._wrapper.status && res._wrapper.status.includes('ERROR')) {
            showToast(`Lỗi: ${res._wrapper.message}`, 'error')
          } else {
            showToast('Đã thay đổi trạng thái khách hàng thành công!', 'success')
            await fetchCustomers(currentPage.value)
          }
        } catch (err) {
          console.error('Failed to change status:', err)
          showToast('Thay đổi trạng thái thất bại. Vui lòng thử lại!', 'error')
        }
      }
    },
    'Thay đổi trạng thái hoạt động'
  )
}

// Navigate to Add Customer
const openAddModal = () => {
  router.push('/customers/create')
}

// Navigate to Edit Customer
const openEditModal = (item) => {
  router.push(`/customers/edit/${item.id}`)
}

// Open Address Modal (Sổ địa chỉ)
const openAddressModal = async (item) => {
  addressModal.value.customer = item
  addressModal.value.addresses = []
  addressModal.value.form = {
    tenNguoiNhan: item.hoTen || '',
    sdt: item.sdt || '',
    selectedProvince: '',
    selectedDistrict: '',
    selectedWard: '',
    diaChiCuThe: '',
    isDefault: false
  }
  districts.value = []
  wards.value = []
  addressModal.value.show = true

  if (isUsingMock.value) {
    addressModal.value.addresses = item.diaChiList || []
  } else {
    try {
      const res = await api.get(`/api/v1/khach-hang/${item.id}`)
      if (res.data) {
        addressModal.value.addresses = res.data.danhSachDiaChi || []
      }
    } catch (err) {
      console.error('Failed to load customer addresses:', err)
      showToast('Không tải được danh sách địa chỉ!', 'error')
    }
  }
}

// Add Address Quick Handler
const addAddressQuick = async () => {
  const f = addressModal.value.form
  if (!f.tenNguoiNhan || !f.sdt || !f.selectedProvince || !f.selectedDistrict || !f.selectedWard || !f.diaChiCuThe) {
    showToast('Vui lòng điền đầy đủ các thông tin địa chỉ!', 'error')
    return
  }

  const phoneRegex = /^(0[3|5|7|8|9])([0-9]{8})$/
  if (!phoneRegex.test(f.sdt)) {
    showToast('Số điện thoại không hợp lệ (VD: 0901234567)!', 'error')
    return
  }

  const customer = addressModal.value.customer

  // Handle local/mock updates
  if (isUsingMock.value) {
    const fullAddressString = `${f.diaChiCuThe}, ${f.selectedWard}, ${f.selectedDistrict}, ${f.selectedProvince}`
    const newAddressObj = {
      id: customer.diaChiList && customer.diaChiList.length ? Math.max(...customer.diaChiList.map(a => a.id)) + 1 : 101,
      tenNguoiNhan: f.tenNguoiNhan,
      sdtNguoiNhan: f.sdt,
      diaChiCuThe: f.diaChiCuThe,
      tinhThanhPho: f.selectedProvince,
      quanHuyen: f.selectedDistrict,
      phuongXa: f.selectedWard,
      kieuDiaChiLaMacDinh: f.isDefault || !customer.diaChiList || customer.diaChiList.length === 0
    }

    const db = getMockDB()
    const target = db.find(c => c.id === customer.id)
    if (target) {
      if (!target.diaChiList) target.diaChiList = []
      
      if (newAddressObj.kieuDiaChiLaMacDinh) {
        target.diaChiList.forEach(a => a.kieuDiaChiLaMacDinh = false)
        target.diaChiMacDinh = fullAddressString
      }
      target.diaChiList.push(newAddressObj)
      if (!target.diaChiMacDinh) target.diaChiMacDinh = fullAddressString
      
      setMockDB(db)
      addressModal.value.addresses = [...target.diaChiList]
      customer.diaChiList = target.diaChiList
      customer.diaChiMacDinh = target.diaChiMacDinh
    }
    showToast('Đã thêm nhanh địa chỉ mới thành công!', 'success')
    await fetchCustomers(currentPage.value)
  } else {
    // Real API payload matching DiaChiRequest DTO
    const addrPayload = {
      tenNguoiNhan: f.tenNguoiNhan,
      sdtNguoiNhan: f.sdt,
      diaChiCuThe: f.diaChiCuThe,
      tinhThanhPho: f.selectedProvince,
      quanHuyen: f.selectedDistrict,
      phuongXa: f.selectedWard,
      kieuDiaChiLaMacDinh: f.isDefault
    }

    try {
      const res = await api.post(`/api/v1/khach-hang/${customer.id}/dia-chi`, addrPayload)
      if (res._wrapper && res._wrapper.status && res._wrapper.status.includes('ERROR')) {
        showToast(`Lỗi: ${res._wrapper.message}`, 'error')
      } else {
        showToast('Thêm địa chỉ thành công!', 'success')
        // Reload details
        const detailRes = await api.get(`/api/v1/khach-hang/${customer.id}`)
        if (detailRes.data) {
          addressModal.value.addresses = detailRes.data.danhSachDiaChi || []
          // Update customer list row value
          const defAddr = addressModal.value.addresses.find(a => a.kieuDiaChiLaMacDinh)
          if (defAddr) {
            customer.diaChiMacDinh = getFullAddressText(defAddr)
          }
        }
        await fetchCustomers(currentPage.value)
      }
    } catch (err) {
      console.error('Failed to post address:', err)
      showToast('Thêm địa chỉ thất bại. Vui lòng thử lại!', 'error')
    }
  }

  // Reset inputs
  addressModal.value.form.selectedProvince = ''
  addressModal.value.form.selectedDistrict = ''
  addressModal.value.form.selectedWard = ''
  addressModal.value.form.diaChiCuThe = ''
  addressModal.value.form.isDefault = false
}

// Set Default Address Inside Modal
const setDefaultAddressQuick = async (index) => {
  const customer = addressModal.value.customer
  const list = [...addressModal.value.addresses]
  const selectedAddr = list[index]

  triggerConfirm(
    `Bạn có chắc chắn muốn đặt địa chỉ "${getFullAddressText(selectedAddr)}" làm địa chỉ mặc định cho khách hàng này không?`,
    async () => {
      if (isUsingMock.value) {
        list.forEach((a, idx) => {
          a.kieuDiaChiLaMacDinh = idx === index
        })
        const db = getMockDB()
        const target = db.find(c => c.id === customer.id)
        if (target) {
          target.diaChiList = list
          target.diaChiMacDinh = getFullAddressText(selectedAddr)
          setMockDB(db)
          customer.diaChiList = list
          customer.diaChiMacDinh = getFullAddressText(selectedAddr)
        }
        addressModal.value.addresses = list
        showToast('Đã thiết lập địa chỉ mặc định!', 'success')
        await fetchCustomers(currentPage.value)
      } else {
        try {
          // PATCH /api/v1/khach-hang/{khachHangId}/dia-chi/{diaChiId}/mac-dinh
          const res = await api.patch(`/api/v1/khach-hang/${customer.id}/dia-chi/${selectedAddr.id}/mac-dinh`)
          if (res._wrapper && res._wrapper.status && res._wrapper.status.includes('ERROR')) {
            showToast(`Lỗi: ${res._wrapper.message}`, 'error')
          } else {
            showToast('Đặt địa chỉ mặc định thành công!', 'success')
            
            // Reload details
            const detailRes = await api.get(`/api/v1/khach-hang/${customer.id}`)
            if (detailRes.data) {
              addressModal.value.addresses = detailRes.data.danhSachDiaChi || []
              customer.diaChiMacDinh = getFullAddressText(selectedAddr)
            }
            await fetchCustomers(currentPage.value)
          }
        } catch (err) {
          console.error('Failed to set default address:', err)
          showToast('Thiết lập địa chỉ mặc định thất bại!', 'error')
        }
      }
    },
    'Đặt địa chỉ mặc định'
  )
}

// Refresh addresses list trigger
const refreshAddressList = async () => {
  const customer = addressModal.value.customer
  if (!customer) return

  showToast('Đang tải lại danh sách địa chỉ...', 'info')
  if (isUsingMock.value) {
    const db = getMockDB()
    const target = db.find(c => c.id === customer.id)
    if (target) {
      addressModal.value.addresses = target.diaChiList || []
    }
    showToast('Đã tải lại danh sách địa chỉ (Mock)!', 'success')
  } else {
    try {
      const res = await api.get(`/api/v1/khach-hang/${customer.id}`)
      if (res.data) {
        addressModal.value.addresses = res.data.danhSachDiaChi || []
      }
      showToast('Đã tải lại danh sách địa chỉ!', 'success')
    } catch (err) {
      showToast('Tải lại danh sách địa chỉ thất bại!', 'error')
    }
  }
}

// Excel Export Action
const exportExcel = async () => {
  showToast('Đang chuẩn bị file xuất Excel...', 'info')
  if (isUsingMock.value) {
    setTimeout(() => {
      showToast('Xuất Excel thành công (Mock)!', 'success')
    }, 1500)
  } else {
    try {
      const response = await api.get('/api/v1/khach-hang/export-excel', {
        responseType: 'blob'
      })
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = `Danh_Sach_Khach_Hang_${new Date().toISOString().slice(0, 10)}.xlsx`
      link.click()
      showToast('Xuất dữ liệu Excel thành công!', 'success')
    } catch (err) {
      console.error('Failed to export excel:', err)
      showToast('Xuất Excel thất bại. Vui lòng thử lại!', 'error')
    }
  }
}

// Compute visible pages for pagination
const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 5
  if (totalPages.value <= maxVisible) {
    for (let i = 0; i < totalPages.value; i++) {
      pages.push(i)
    }
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

onMounted(() => {
  fetchCustomers(0)
  fetchProvinces()
})
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Breadcrumb Title -->
    <h1 class="font-headline-md text-headline-md text-inverse-surface mb-stack-lg font-bold">
      Quản lý tài khoản / Quản lý khách hàng
    </h1>

    <!-- Filter Section -->
    <section class="bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant/30 p-gutter flex flex-col md:flex-row justify-between items-center gap-gutter">
      <div class="flex flex-wrap gap-stack-md flex-1 w-full">
        <!-- Search Input -->
        <div class="relative w-full md:w-64">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" style="font-size: 20px;">search</span>
          <input 
            v-model="searchQuery"
            class="w-full pl-10 pr-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container font-body-md text-body-md placeholder-on-surface-variant transition-all" 
            placeholder="Tìm theo tên, sđt, email" 
            type="text"
          />
        </div>

        <!-- Gender select -->
        <div class="relative">
          <select 
            v-model="selectedGender"
            class="appearance-none border border-outline-variant rounded-lg bg-surface-container-lowest py-2 pl-3 pr-10 focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container font-body-md text-body-md text-on-surface-variant cursor-pointer transition-all"
          >
            <option value="all">Giới tính (Tất cả)</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
          </select>
          <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" style="font-size: 20px;">expand_more</span>
        </div>

        <!-- Status select -->
        <div class="relative">
          <select 
            v-model="selectedStatus"
            class="appearance-none border border-outline-variant rounded-lg bg-surface-container-lowest py-2 pl-3 pr-10 focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container font-body-md text-body-md text-on-surface-variant cursor-pointer transition-all"
          >
            <option value="all">Trạng thái (Tất cả)</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Ngừng hoạt động</option>
          </select>
          <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" style="font-size: 20px;">expand_more</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-stack-md w-full md:w-auto justify-end">
        <!-- Reset Filters -->
        <button 
          @click="resetFilters"
          class="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface-container-low transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">refresh</span>
          Làm mới
        </button>

        <!-- Export Excel -->
        <button 
          @click="exportExcel"
          class="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface-container-low transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">download</span>
          Xuất Excel
        </button>

        <!-- Add Customer -->
        <button 
          @click="openAddModal"
          class="px-4 py-2 bg-primary-container text-on-primary rounded-lg font-label-sm text-label-sm hover:bg-primary transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">add</span>
          Thêm mới
        </button>
      </div>
    </section>

    <!-- Data Table Section -->
    <section class="bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col min-h-[400px]">
      <div v-if="isLoading" class="p-10 flex flex-col items-center justify-center gap-3 flex-1">
        <div class="w-8 h-8 border-4 border-primary-container border-t-transparent rounded-full animate-spin"></div>
        <span class="text-sm font-semibold text-on-surface-variant">Đang tải danh sách khách hàng...</span>
      </div>

      <div v-else-if="customers.length === 0" class="p-10 text-center flex-1 flex flex-col items-center justify-center gap-2">
        <span class="material-symbols-outlined text-gray-400 text-5xl">search_off</span>
        <p class="text-sm text-gray-500 font-medium">Không tìm thấy khách hàng nào phù hợp với bộ lọc.</p>
      </div>

      <div v-else class="overflow-x-auto flex-1">
        <table class="w-full text-left border-collapse">
          <thead class="bg-surface border-b border-outline-variant sticky top-0">
            <tr>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap text-center w-16">STT</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap w-24">MÃ KH</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap">HỌ TÊN</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap">SĐT</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap">EMAIL</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap">ĐỊA CHỈ</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap w-28">GIỚI TÍNH</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap w-32">TRẠNG THÁI</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap text-center w-36">THAO TÁC</th>
            </tr>
          </thead>
          <tbody class="font-body-md text-body-md divide-y divide-outline-variant/20">
            <tr 
              v-for="(item, index) in customers" 
              :key="item.id"
              class="hover:bg-surface-container-low transition-colors"
            >
              <td class="py-3 px-4 text-center text-on-surface-variant">
                {{ index + 1 + currentPage * pageSize }}
              </td>
              <td class="py-3 px-4 font-bold text-on-surface">{{ item.maKhachHang }}</td>
              <td class="py-3 px-4 font-semibold text-on-surface">{{ item.hoTen }}</td>
              <td class="py-3 px-4 text-on-surface-variant">{{ item.sdt }}</td>
              <td class="py-3 px-4 text-on-surface-variant">{{ item.email }}</td>
              <td 
                class="py-3 px-4 truncate max-w-[150px] text-on-surface-variant"
                :title="item.diaChiMacDinh || 'Chưa cập nhật địa chỉ'"
              >
                {{ item.diaChiMacDinh || 'Chưa cập nhật' }}
              </td>
              <td class="py-3 px-4 text-on-surface">
                {{ item.gioiTinh === 1 ? 'Nam' : item.gioiTinh === 0 ? 'Nữ' : 'Khác' }}
              </td>
              <td class="py-3 px-4">
                <span 
                  v-if="item.trangThai === 1"
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DEF7EC] text-[#03543F]"
                >
                  Hoạt động
                </span>
                <span 
                  v-else
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-variant text-on-surface-variant"
                >
                  Ngừng hoạt động
                </span>
              </td>
              <td class="py-3 px-4">
                <div class="flex items-center justify-center gap-3">
                  <!-- View / Edit Button -->
                  <button 
                    @click="openEditModal(item)"
                    class="text-secondary hover:text-inverse-surface transition-colors cursor-pointer"
                    title="Chi tiết / Cập nhật"
                  >
                    <span class="material-symbols-outlined text-[20px]">visibility</span>
                  </button>

                  <!-- Address Management Button -->
                  <button 
                    @click="openAddressModal(item)"
                    class="text-secondary hover:text-inverse-surface transition-colors cursor-pointer"
                    title="Quản lý địa chỉ"
                  >
                    <span class="material-symbols-outlined text-[20px]">location_on</span>
                  </button>

                  <!-- Toggle Switch -->
                  <button
                    @click="handleToggle(item)"
                    :aria-checked="item.trangThai === 1 ? 'true' : 'false'"
                    :class="item.trangThai === 1 ? 'bg-primary-container' : 'bg-outline-variant'"
                    class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer"
                    role="switch"
                  >
                    <span
                      :class="item.trangThai === 1 ? 'translate-x-5' : 'translate-x-1'"
                      class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform"
                    ></span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Card Footer -->
      <div class="p-gutter border-t border-outline-variant bg-surface-container-lowest flex flex-col sm:flex-row justify-between items-center gap-4" v-if="customers.length > 0">
        <!-- Left side: Items counter & Page size selector -->
        <div class="flex flex-wrap items-center gap-4 text-sm font-semibold text-on-surface-variant font-body-md">
          <span>
            Hiển thị {{ Math.min(currentPage * pageSize + 1, totalElements) }} - {{ Math.min((currentPage + 1) * pageSize, totalElements) }} trên tổng số {{ totalElements }} khách hàng
          </span>
          <div class="flex items-center gap-2">
            <span>Hiển thị</span>
            <select 
              v-model="pageSize" 
              @change="fetchCustomers(0)" 
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

        <!-- Right side: Navigation buttons -->
        <nav class="flex items-center gap-1" v-if="totalPages > 1">
          <button 
            @click="fetchCustomers(currentPage - 1)"
            :disabled="currentPage === 0"
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span class="material-symbols-outlined text-[16px]">chevron_left</span>
          </button>
          
          <button 
            v-for="(page, idx) in visiblePages"
            :key="idx"
            @click="page !== '...' && fetchCustomers(page)"
            :class="page === currentPage ? 'bg-primary-container text-on-primary font-bold shadow-sm' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-low hover:text-primary-container cursor-pointer'"
            class="w-8 h-8 flex items-center justify-center rounded-lg font-body-md text-body-md transition-colors"
            :disabled="page === '...'"
          >
            {{ page === '...' ? '...' : page + 1 }}
          </button>

          <button 
            @click="fetchCustomers(currentPage + 1)"
            :disabled="currentPage === totalPages - 1"
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span class="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </nav>
      </div>
    </section>
  </div>

  <!-- Sổ địa chỉ khách hàng Dialog Modal -->
  <div v-if="addressModal.show" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
    <div class="bg-white text-[#0D2533] rounded-xl max-w-4xl w-full overflow-hidden border border-gray-100 shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div class="flex items-start gap-3">
          <span class="material-symbols-outlined text-red-500 text-3xl mt-0.5" style="font-variation-settings: 'FILL' 1;">location_on</span>
          <div>
            <h3 class="font-headline-md text-lg font-bold text-gray-800 leading-tight">Sổ địa chỉ khách hàng</h3>
            <p class="text-xs font-semibold text-gray-500 mt-0.5">
              {{ addressModal.customer?.hoTen }} • {{ addressModal.customer?.maKhachHang }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <!-- Refresh button -->
          <button 
            @click="refreshAddressList" 
            class="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors cursor-pointer" 
            title="Làm mới"
          >
            <span class="material-symbols-outlined text-[18px]">refresh</span>
          </button>
          <!-- Close button -->
          <button 
            @click="addressModal.show = false" 
            class="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>

      <!-- Two-Column Content Body -->
      <div class="flex flex-col lg:flex-row overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
        
        <!-- Left Panel: Danh sách địa chỉ -->
        <div class="w-full lg:w-1/2 p-6 flex flex-col min-h-[300px]">
          <h4 class="text-sm font-bold text-gray-700 flex items-center gap-1.5 mb-4 border-b border-gray-50 pb-2">
            <span class="material-symbols-outlined text-[18px]">list_alt</span>
            Danh sách địa chỉ
          </h4>
          
          <div class="overflow-x-auto flex-1 max-h-[350px] scrollbar-thin">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-100">
                  <th class="py-2 px-3 text-xs font-bold text-gray-500 uppercase text-center w-12">STT</th>
                  <th class="py-2 px-3 text-xs font-bold text-gray-500 uppercase">Địa chỉ</th>
                  <th class="py-2 px-3 text-xs font-bold text-gray-500 uppercase text-center w-24">Mặc định</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 text-sm">
                <tr 
                  v-for="(addr, idx) in addressModal.addresses" 
                  :key="addr.id"
                  class="hover:bg-gray-50/50 transition-colors"
                >
                  <td class="py-3 px-3 text-center text-gray-500 font-semibold">{{ idx + 1 }}</td>
                  <td class="py-3 px-3">
                    <p class="text-gray-800 font-medium leading-relaxed mb-0.5">{{ getFullAddressText(addr) }}</p>
                    <p class="text-xs text-gray-400">
                      Người nhận: {{ addr.tenNguoiNhan }} - SĐT: {{ addr.sdtNguoiNhan || addr.sdt }}
                    </p>
                  </td>
                  <td class="py-3 px-3 text-center">
                    <span 
                      v-if="addr.kieuDiaChiLaMacDinh" 
                      class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FDE8E8] text-[#9B1C1C]"
                    >
                      Mặc định
                    </span>
                    <button 
                      v-else 
                      @click="setDefaultAddressQuick(idx)"
                      class="text-xs text-primary-container hover:underline font-semibold cursor-pointer"
                    >
                      Đặt mặc định
                    </button>
                  </td>
                </tr>
                <tr v-if="addressModal.addresses.length === 0">
                  <td colspan="3" class="py-8 text-center text-gray-400">
                    <span class="material-symbols-outlined text-3xl">home_pin</span>
                    <p class="text-xs mt-1">Chưa đăng ký địa chỉ nào.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right Panel: Thêm nhanh địa chỉ -->
        <div class="w-full lg:w-1/2 p-6 flex flex-col">
          <h4 class="text-sm font-bold text-gray-700 flex items-center gap-1.5 mb-4 border-b border-gray-50 pb-2">
            <span class="material-symbols-outlined text-[18px]">send</span>
            Thêm nhanh địa chỉ
          </h4>

          <div class="space-y-4 text-sm font-body-md flex-1">
            <!-- Họ tên & Số điện thoại row -->
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-xs font-semibold text-gray-600">Họ tên người nhận <span class="text-red-500">*</span></label>
                <input 
                  type="text" 
                  v-model="addressModal.form.tenNguoiNhan" 
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container text-xs"
                  placeholder="Nhập họ tên người nhận"
                  required
                />
              </div>
              <div class="space-y-1">
                <label class="block text-xs font-semibold text-gray-600">Số điện thoại <span class="text-red-500">*</span></label>
                <input 
                  type="text" 
                  v-model="addressModal.form.sdt" 
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container text-xs"
                  placeholder="Nhập số điện thoại"
                  required
                />
              </div>
            </div>

            <!-- Tỉnh/Thành & Quận/Huyện select row -->
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-xs font-semibold text-gray-600">Thành phố/Tỉnh <span class="text-red-500">*</span></label>
                <div class="relative">
                  <select 
                    v-model="addressModal.form.selectedProvince"
                    @change="onProvinceChange"
                    class="w-full appearance-none px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container text-xs cursor-pointer"
                  >
                    <option value="">Chọn hoặc nhập tỉnh/thành</option>
                    <option v-for="prov in provinces" :key="prov.code" :value="prov.name">{{ prov.name }}</option>
                  </select>
                  <span class="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[18px]">expand_more</span>
                </div>
              </div>
              
              <div class="space-y-1">
                <label class="block text-xs font-semibold text-gray-600">Quận/Huyện <span class="text-red-500">*</span></label>
                <div class="relative">
                  <select 
                    v-model="addressModal.form.selectedDistrict"
                    @change="onDistrictChange"
                    :disabled="!addressModal.form.selectedProvince"
                    class="w-full appearance-none px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container text-xs cursor-pointer disabled:bg-gray-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Chọn hoặc nhập quận/huyện</option>
                    <option v-for="dist in districts" :key="dist.code" :value="dist.name">{{ dist.name }}</option>
                  </select>
                  <span class="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[18px]">expand_more</span>
                </div>
              </div>
            </div>

            <!-- Phường/Xã & Địa chỉ chi tiết row -->
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-xs font-semibold text-gray-600">Phường/Xã <span class="text-red-500">*</span></label>
                <div class="relative">
                  <select 
                    v-model="addressModal.form.selectedWard"
                    :disabled="!addressModal.form.selectedDistrict"
                    class="w-full appearance-none px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container text-xs cursor-pointer disabled:bg-gray-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Chọn hoặc nhập phường/xã</option>
                    <option v-for="wd in wards" :key="wd.code" :value="wd.name">{{ wd.name }}</option>
                  </select>
                  <span class="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[18px]">expand_more</span>
                </div>
              </div>

              <div class="space-y-1">
                <label class="block text-xs font-semibold text-gray-600">Địa chỉ cụ thể <span class="text-red-500">*</span></label>
                <input 
                  type="text" 
                  v-model="addressModal.form.diaChiCuThe" 
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container text-xs"
                  placeholder="Số nhà, đường..."
                  required
                />
              </div>
            </div>

            <!-- Set as Default Checkbox -->
            <div class="flex items-center gap-2 pt-2">
              <input 
                id="defaultQuickCheckbox"
                type="checkbox" 
                v-model="addressModal.form.isDefault" 
                class="rounded text-primary-container focus:ring-primary-container w-4 h-4 cursor-pointer"
              />
              <label for="defaultQuickCheckbox" class="text-xs font-semibold text-gray-600 select-none cursor-pointer">
                Đặt làm địa chỉ mặc định
              </label>
            </div>

            <!-- Quick Add Button -->
            <div class="pt-4 flex justify-end">
              <button 
                @click="addAddressQuick"
                class="bg-[#0F172A] hover:bg-[#1E293B] text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors cursor-pointer shadow-md flex items-center gap-1"
              >
                Thêm nhanh
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- Custom Confirmation Modal -->
  <div v-if="confirmModal.show" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white text-[#0D2533] rounded-xl max-w-md w-full overflow-hidden border border-gray-100 shadow-2xl animate-fade-in">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
        <span class="material-symbols-outlined text-primary-container text-2xl">help_outline</span>
        <h3 class="font-headline-md text-base font-bold text-gray-800">{{ confirmModal.title }}</h3>
      </div>
      <div class="p-6 text-sm font-medium text-gray-600 font-body-md leading-relaxed font-semibold">
        {{ confirmModal.message }}
      </div>
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
        <button 
          type="button" 
          @click="confirmModal.show = false"
          class="border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
        >
          Hủy bộ
        </button>
        <button 
          type="button" 
          @click="handleConfirm"
          class="bg-primary-container hover:bg-primary text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer shadow-sm"
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
      'bg-blue-50 border-blue-200 text-blue-800': toast.type === 'info'
    }"
  >
    <span class="material-symbols-outlined text-lg">
      {{ toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info' }}
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

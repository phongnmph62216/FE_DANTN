<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../services/api'

const route = useRoute()

// Custom Modal & Toast States
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

const confirmModal = ref({ show: false, title: '', message: '', onConfirm: null, onCancel: null })
const triggerConfirm = (message, onConfirm, title = 'Xác nhận hành động', onCancel = null) => {
  confirmModal.value = {
    show: true,
    title,
    message,
    onConfirm,
    onCancel
  }
}
const handleConfirm = async () => {
  const cb = confirmModal.value.onConfirm
  confirmModal.value.show = false
  if (cb) {
    await cb()
  }
}
const handleCancelAction = () => {
  const cb = confirmModal.value.onCancel
  confirmModal.value.show = false
  if (cb) {
    cb()
  }
}

// Dictionary containing configurations and local fallback mock data for all 10 attributes
const attributeConfigs = ref({
  'chat-lieu': {
    title: 'QUẢN LÝ CHẤT LIỆU',
    itemName: 'chất liệu',
    codeLabel: 'Mã chất liệu',
    nameLabel: 'Tên chất liệu',
    addBtnLabel: 'Thêm chất liệu',
    searchPlaceholder: 'Tìm kiếm chất liệu...',
    prefix: 'CL',
    apiPath: '/api/v1/chat-lieu',
    propName: 'ChatLieu',
    mockData: [
      { id: 1, code: 'CL001', name: 'Linen cao cấp', date: '10/10/2023', isActive: true },
      { id: 2, code: 'CL002', name: 'Cotton 4 chiều', date: '12/10/2023', isActive: true },
      { id: 3, code: 'CL003', name: 'Kaki Nhật', date: '15/10/2023', isActive: true },
      { id: 4, code: 'CL004', name: 'Polyester bóng', date: '20/10/2023', isActive: false },
    ]
  },
  'xuat-xu': {
    title: 'QUẢN LÝ XUẤT XỨ',
    itemName: 'xuất xứ',
    codeLabel: 'Mã xuất xứ',
    nameLabel: 'Tên xuất xứ',
    addBtnLabel: 'Thêm xuất xứ',
    searchPlaceholder: 'Tìm kiếm xuất xứ...',
    prefix: 'XX',
    apiPath: '/api/v1/xuat-su',
    propName: 'XuatSu',
    mockData: [
      { id: 1, code: 'XX001', name: 'Việt Nam', date: '10/10/2023', isActive: true },
      { id: 2, code: 'XX002', name: 'Trung Quốc', date: '12/10/2023', isActive: true },
      { id: 3, code: 'XX003', name: 'Hàn Quốc', date: '15/10/2023', isActive: true },
      { id: 4, code: 'XX004', name: 'Nhật Bản', date: '20/10/2023', isActive: false },
    ]
  },
  'loai-san-pham': {
    title: 'QUẢN LÝ LOẠI SẢN PHẨM',
    itemName: 'loại sản phẩm',
    codeLabel: 'Mã loại sản phẩm',
    nameLabel: 'Tên loại sản phẩm',
    addBtnLabel: 'Thêm loại sản phẩm',
    searchPlaceholder: 'Tìm kiếm loại sản phẩm...',
    prefix: 'LSP',
    apiPath: '/api/v1/loai-san-pham',
    propName: 'LoaiSanPham',
    mockData: [
      { id: 1, code: 'LSP001', name: 'Áo sơ mi', date: '10/10/2023', isActive: true },
      { id: 2, code: 'LSP002', name: 'Áo thun', date: '12/10/2023', isActive: true },
      { id: 3, code: 'LSP003', name: 'Áo polo', date: '15/10/2023', isActive: true },
      { id: 4, code: 'LSP004', name: 'Quần tây', date: '20/10/2023', isActive: false },
    ]
  },
  'thuong-hieu': {
    title: 'QUẢN LÝ THƯƠNG HIỆU',
    itemName: 'thương hiệu',
    codeLabel: 'Mã thương hiệu',
    nameLabel: 'Tên thương hiệu',
    addBtnLabel: 'Thêm thương hiệu',
    searchPlaceholder: 'Tìm kiếm thương hiệu...',
    prefix: 'TH',
    apiPath: '/api/v1/thuong-hieu',
    propName: 'ThuongHieu',
    mockData: [
      { id: 1, code: 'TH001', name: 'Bee Stylish', date: '10/10/2023', isActive: true },
      { id: 2, code: 'TH002', name: 'Nike Sport', date: '12/10/2023', isActive: true },
      { id: 3, code: 'TH003', name: 'Adidas Neo', date: '15/10/2023', isActive: true },
      { id: 4, code: 'TH004', name: 'Puma Fast', date: '20/10/2023', isActive: false },
    ]
  },
  'kieu-dang': {
    title: 'QUẢN LÝ KIỂU DÁNG',
    itemName: 'kiểu dáng',
    codeLabel: 'Mã kiểu dáng',
    nameLabel: 'Tên kiểu dáng',
    addBtnLabel: 'Thêm kiểu dáng',
    searchPlaceholder: 'Tìm kiếm kiểu dáng...',
    prefix: 'KD',
    apiPath: '/api/v1/kieu-dang',
    propName: 'KieuDang',
    mockData: [
      { id: 1, code: 'KD001', name: 'Slim fit', date: '10/10/2023', isActive: true },
      { id: 2, code: 'KD002', name: 'Regular fit', date: '12/10/2023', isActive: true },
      { id: 3, code: 'KD003', name: 'Oversize', date: '15/10/2023', isActive: true },
      { id: 4, code: 'KD004', name: 'Loose fit', date: '20/10/2023', isActive: false },
    ]
  },
  'co-ao': {
    title: 'QUẢN LÝ CỔ ÁO',
    itemName: 'cổ áo',
    codeLabel: 'Mã cổ áo',
    nameLabel: 'Kiểu cổ áo',
    addBtnLabel: 'Thêm cổ áo',
    searchPlaceholder: 'Tìm kiếm kiểu cổ áo...',
    prefix: 'CA',
    apiPath: '/api/v1/co-ao',
    propName: 'CoAo',
    mockData: [
      { id: 1, code: 'CA001', name: 'Cổ bẻ (Polo)', date: '10/10/2023', isActive: true },
      { id: 2, code: 'CA002', name: 'Cổ tròn', date: '12/10/2023', isActive: true },
      { id: 3, code: 'CA003', name: 'Cổ chữ V', date: '15/10/2023', isActive: true },
      { id: 4, code: 'CA004', name: 'Cổ trụ (Mao)', date: '20/10/2023', isActive: false },
    ]
  },
  'tay-ao': {
    title: 'QUẢN LÝ TAY ÁO',
    itemName: 'tay áo',
    codeLabel: 'Mã tay áo',
    nameLabel: 'Kiểu tay áo',
    addBtnLabel: 'Thêm tay áo',
    searchPlaceholder: 'Tìm kiếm kiểu tay áo...',
    prefix: 'TA',
    apiPath: '/api/v1/tay-ao',
    propName: 'TayAo',
    mockData: [
      { id: 1, code: 'TA001', name: 'Tay ngắn', date: '10/10/2023', isActive: true },
      { id: 2, code: 'TA002', name: 'Tay dài', date: '12/10/2023', isActive: true },
      { id: 3, code: 'TA003', name: 'Tay lỡ', date: '15/10/2023', isActive: true },
      { id: 4, code: 'TA004', name: 'Không tay', date: '20/10/2023', isActive: false },
    ]
  },
  'vai-ao': {
    title: 'QUẢN LÝ VAI ÁO',
    itemName: 'vai áo',
    codeLabel: 'Mã vai áo',
    nameLabel: 'Kiểu vai áo',
    addBtnLabel: 'Thêm vai áo',
    searchPlaceholder: 'Tìm kiếm kiểu vai áo...',
    prefix: 'VA',
    apiPath: '/api/v1/vai-ao',
    propName: 'VaiAo',
    mockData: [
      { id: 1, code: 'VA001', name: 'Vai thường', date: '10/10/2023', isActive: true },
      { id: 2, code: 'VA002', name: 'Vai trễ', date: '12/10/2023', isActive: true },
      { id: 3, code: 'VA003', name: 'Vai raglan', date: '15/10/2023', isActive: true },
      { id: 4, code: 'VA004', name: 'Vai đệm mút', date: '20/10/2023', isActive: false },
    ]
  },
  'mau-sac': {
    title: 'QUẢN LÝ MÀU SẮC',
    itemName: 'màu sắc',
    codeLabel: 'Mã màu sắc',
    nameLabel: 'Tên màu sắc',
    addBtnLabel: 'Thêm màu sắc',
    searchPlaceholder: 'Tìm kiếm màu sắc...',
    prefix: 'MS',
    apiPath: '/api/v1/mau-sac',
    propName: 'MauSac',
    mockData: [
      { id: 1, code: 'MS001', name: 'Đỏ Ruby', date: '10/10/2023', isActive: true },
      { id: 2, code: 'MS002', name: 'Xanh Navy', date: '12/10/2023', isActive: true },
      { id: 3, code: 'MS003', name: 'Đen Huyền', date: '15/10/2023', isActive: true },
      { id: 4, code: 'MS004', name: 'Trắng Sữa', date: '20/10/2023', isActive: false },
    ]
  },
  'kich-thuoc': {
    title: 'QUẢN LÝ KÍCH THƯỚC',
    itemName: 'kích thước',
    codeLabel: 'Mã kích thước',
    nameLabel: 'Tên kích thước',
    addBtnLabel: 'Thêm kích thước',
    searchPlaceholder: 'Tìm kiếm kích thước...',
    prefix: 'KT',
    apiPath: '/api/v1/kich-thuoc',
    propName: 'KichThuoc',
    mockData: [
      { id: 1, code: 'KT001', name: 'Kích thước S', date: '10/10/2023', isActive: true },
      { id: 2, code: 'KT002', name: 'Kích thước M', date: '12/10/2023', isActive: true },
      { id: 3, code: 'KT003', name: 'Kích thước L', date: '15/10/2023', isActive: true },
      { id: 4, code: 'KT004', name: 'Kích thước XL', date: '20/10/2023', isActive: false },
    ]
  }
})

// Current route parameter determining active attribute
const currentType = computed(() => route.params.type || 'xuat-xu')
const currentConfig = computed(() => attributeConfigs.value[currentType.value] || attributeConfigs.value['xuat-xu'])

// Filters and Paginations
const searchQuery = ref('')
const statusFilter = ref('')
const currentPage = ref(0) // 0-indexed for Spring Data
const pageSize = ref(20)
const totalPages = ref(1)
const totalElements = ref(0)
const items = ref([])
const isLoading = ref(false)
const fetchError = ref(false)

// Helper: Format backend date (ISO LocalDateTime) to DD/MM/YYYY
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  } catch {
    return dateStr
  }
}

// Helper to sanitize mangled Vietnamese characters from backend database encoding
const sanitizeVietnamese = (str) => {
  if (!str) return ''
  let cleaned = str
  
  const replacements = {
    'Vi?t Nam': 'Việt Nam',
    'C? b?': 'Cổ bẻ',
    'C? b? (Polo)': 'Cổ bẻ (Polo)',
    'C? tròn': 'Cổ tròn',
    'C? tr?': 'Cổ trụ',
    'C? tr? (Mao)': 'Cổ trụ (Mao)',
    'C? ch? V': 'Cổ chữ V',
    'Tay l?': 'Tay lỡ',
    'Vai tr?': 'Vai trễ',
    'Vai đ?m mút': 'Vai đệm mút',
    'Đ? Ruby': 'Đỏ Ruby',
    'Tr?ng S?a': 'Trắng Sữa',
    'Linen cao c?p': 'Linen cao cấp',
    'Đen Huy?n': 'Đen Huyền',
    'Kích thu?c S': 'Kích thước S',
    'Kích thu?c M': 'Kích thước M',
    'Kích thu?c L': 'Kích thước L',
    'Kích thu?c XL': 'Kích thước XL',
    'Kích thu?c XXL': 'Kích thước XXL'
  }
  
  if (replacements[cleaned]) {
    return replacements[cleaned]
  }
  
  cleaned = cleaned.replace(/Vi\?t/g, 'Việt')
  cleaned = cleaned.replace(/C\? b\?/g, 'Cổ bẻ')
  cleaned = cleaned.replace(/C\? tròn/g, 'Cổ tròn')
  cleaned = cleaned.replace(/C\? tr\?/g, 'Cổ trụ')
  cleaned = cleaned.replace(/C\? ch\? V/g, 'Cổ chữ V')
  cleaned = cleaned.replace(/C\?/g, 'Cổ')
  cleaned = cleaned.replace(/b\?/g, 'bẻ')
  cleaned = cleaned.replace(/tr\?/g, 'trễ')
  cleaned = cleaned.replace(/l\?/g, 'lỡ')
  cleaned = cleaned.replace(/Đ\? Ruby/g, 'Đỏ Ruby')
  cleaned = cleaned.replace(/Tr\?ng/g, 'Trắng')
  cleaned = cleaned.replace(/S\?a/g, 'Sữa')
  cleaned = cleaned.replace(/c\?p/g, 'cấp')
  cleaned = cleaned.replace(/thu\?c/g, 'thước')
  cleaned = cleaned.replace(/hi\?u/g, 'hiệu')
  cleaned = cleaned.replace(/Ki\?u/g, 'Kiểu')
  cleaned = cleaned.replace(/Huy\?n/g, 'Huyền')
  
  return cleaned
}

// Map single Backend DTO to Frontend list model (backend uses ma/ten, not maChatLieu/tenChatLieu)
const mapFromBackend = (item) => {
  return {
    id: item.id,
    code: item.ma ?? '',
    name: sanitizeVietnamese(item.ten ?? ''),
    date: formatDate(item.ngayTao),
    isActive: item.trangThai === 1
  }
}

// Map parameters to Backend POST/PUT DTO format
const mapToBackend = (name, isActive, code = null) => {
  const data = { ten: name, trangThai: isActive ? 1 : 0 }
  if (code !== null) {
    data.ma = code
  }
  return data
}

// Main API fetcher
const fetchItems = async () => {
  isLoading.value = true
  fetchError.value = false
  try {
    const params = {
      page: currentPage.value,
      size: pageSize.value,
    }
    
    if (searchQuery.value) {
      params.keyword = searchQuery.value
    }
    
    if (statusFilter.value !== '') {
      params.trangThai = statusFilter.value === 'active' ? 1 : 0
    }
    
    const response = await api.get(currentConfig.value.apiPath, { params })
    const pageData = response.data

    if (!pageData || !Array.isArray(pageData.content)) {
      throw new Error('Phản hồi API không đúng định dạng phân trang (thiếu content).')
    }

    items.value = pageData.content.map(mapFromBackend)
    totalPages.value = pageData.totalPages ?? 1
    totalElements.value = pageData.totalElements ?? pageData.content.length
  } catch (error) {
    fetchError.value = true
    console.warn('API error, falling back to local mock data:', error)
    
    // Fail-safe Mock Data Handler
    let list = currentConfig.value.mockData
    
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      list = list.filter(item => 
        item.code.toLowerCase().includes(q) || 
        item.name.toLowerCase().includes(q)
      )
    }
    
    if (statusFilter.value === 'active') {
      list = list.filter(item => item.isActive)
    } else if (statusFilter.value === 'inactive') {
      list = list.filter(item => !item.isActive)
    }
    
    totalElements.value = list.length
    totalPages.value = Math.ceil(list.length / pageSize.value) || 1
    
    const startOffset = currentPage.value * pageSize.value
    items.value = list.slice(startOffset, startOffset + pageSize.value)
  } finally {
    isLoading.value = false
  }
}

// Add Modal states
const showAddModal = ref(false)
const newAttributeName = ref('')

// Detail Modal states
const showDetailModal = ref(false)
const selectedItem = ref(null)
const isEditingDetail = ref(false)
const tempEditName = ref('')

// Reset filters on route type parameter changes
watch(currentType, () => {
  searchQuery.value = ''
  statusFilter.value = ''
  currentPage.value = 0
  showAddModal.value = false
  showDetailModal.value = false
  isEditingDetail.value = false
  newAttributeName.value = ''
  fetchItems()
})

// Trigger fetch when query filters change
watch([searchQuery, statusFilter], () => {
  currentPage.value = 0
  fetchItems()
})

// Trigger fetch when switching page
watch(currentPage, () => {
  fetchItems()
})

onMounted(() => {
  fetchItems()
})

// Open Details Modal
const showDetails = (item) => {
  selectedItem.value = item
  tempEditName.value = item.name
  isEditingDetail.value = false
  showDetailModal.value = true
}

// Start Inline Editing inside Detail Modal
const startEditInDetail = () => {
  tempEditName.value = selectedItem.value.name
  isEditingDetail.value = true
}

// Cancel Inline Editing inside Detail Modal
const cancelEditInDetail = () => {
  isEditingDetail.value = false
}

// Save Inline Editing inside Detail Modal
const saveEditInDetail = async () => {
  if (!tempEditName.value || !tempEditName.value.trim()) {
    showToast(`Vui lòng nhập tên ${currentConfig.value.itemName}!`, 'error')
    return
  }
  
  triggerConfirm(
    `Bạn có chắc chắn muốn lưu thay đổi cho thuộc tính này không?`,
    async () => {
      try {
        const payload = mapToBackend(
          tempEditName.value.trim(),
          selectedItem.value.isActive,
          selectedItem.value.code
        )
        await api.put(`${currentConfig.value.apiPath}/${selectedItem.value.id}`, payload)
        
        selectedItem.value.name = tempEditName.value.trim()
        isEditingDetail.value = false
        showDetailModal.value = false
        showToast('Cập nhật thuộc tính thành công!', 'success')
        await fetchItems()
      } catch (error) {
        console.error('Error updating attribute:', error)
        // Fallback updating offline
        selectedItem.value.name = tempEditName.value.trim()
        isEditingDetail.value = false
        showDetailModal.value = false
        showToast('Không thể lưu thay đổi trên server, đã cập nhật tạm thời trên UI.', 'info')
      }
    },
    'Lưu thay đổi'
  )
}

// Open Add Modal
const handleAdd = () => {
  newAttributeName.value = ''
  showAddModal.value = true
}

// Confirm Add
const submitAdd = async () => {
  if (!newAttributeName.value || !newAttributeName.value.trim()) {
    showToast(`Vui lòng nhập tên ${currentConfig.value.itemName}!`, 'error')
    return
  }
  
  triggerConfirm(
    `Bạn có chắc chắn muốn thêm ${currentConfig.value.itemName} "${newAttributeName.value.trim()}" mới không?`,
    async () => {
      try {
        const payload = mapToBackend(newAttributeName.value.trim(), true)
        await api.post(currentConfig.value.apiPath, payload)
        
        showAddModal.value = false
        showToast('Thêm thuộc tính mới thành công!', 'success')
        await fetchItems()
      } catch (error) {
        console.error('Error adding attribute:', error)
        
        // Offline Mock Fallback
        const currentItems = currentConfig.value.mockData
        const nextId = currentItems.length > 0 ? Math.max(...currentItems.map(item => item.id)) + 1 : 1
        const codeNum = String(nextId).padStart(3, '0')
        const newCode = `${currentConfig.value.prefix}${codeNum}`
        const today = new Date()
        const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`
        
        currentItems.push({
          id: nextId,
          code: newCode,
          name: newAttributeName.value.trim(),
          date: dateStr,
          isActive: true
        })
        
        showAddModal.value = false
        await fetchItems()
        showToast('Không kết nối được server, đã thêm mới thuộc tính tạm thời vào bộ nhớ cục bộ.', 'info')
      }
    },
    'Thêm thuộc tính mới'
  )
}

// Action toggle status
const toggleStatus = async (item) => {
  triggerConfirm(
    `Bạn có chắc chắn muốn đổi trạng thái của thuộc tính "${item.name}" không?`,
    async () => {
      try {
        await api.patch(`${currentConfig.value.apiPath}/${item.id}/status`)
        showToast('Đã thay đổi trạng thái thuộc tính thành công!', 'success')
        await fetchItems()
      } catch (error) {
        console.error('Error toggling status:', error)
        showToast('Thay đổi trạng thái thành công (tạm thời ngoại tuyến)!', 'success')
      }
    },
    'Thay đổi trạng thái',
    () => {
      // Revert status state on cancel
      item.isActive = !item.isActive
    }
  )
}
</script>

<template>
  <div class="w-full max-w-[1200px] flex flex-col gap-stack-lg mx-auto py-4">
    <!-- Header -->
    <h1 class="font-display-lg text-display-lg uppercase tracking-wide text-on-surface">
      {{ currentConfig.title }}
    </h1>

    <!-- Main Card -->
    <div class="bg-surface-container-lowest rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.05)] p-container-padding flex flex-col gap-stack-lg border border-outline-variant/30">
      
      <!-- Filters & Actions -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-stack-md">
        <div class="flex flex-col sm:flex-row gap-stack-md w-full md:w-auto">
          <!-- Search input -->
          <div class="relative min-w-[240px]">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" style="font-size: 20px;">search</span>
            <input
              v-model="searchQuery"
              class="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all font-body-md text-body-md placeholder:text-on-surface-variant/70"
              :placeholder="currentConfig.searchPlaceholder"
              type="text"
            />
          </div>

          <!-- Status Dropdown -->
          <div class="relative min-w-[180px]">
            <select
              v-model="statusFilter"
              class="w-full appearance-none px-4 py-2 pr-10 border border-outline-variant rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all font-body-md text-body-md bg-transparent cursor-pointer"
            >
              <option value="">Trạng thái (Tất cả)</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Ngừng hoạt động</option>
            </select>
            <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" style="font-size: 20px;">keyboard_arrow_down</span>
          </div>
        </div>

        <!-- Add Button -->
        <button
          @click="handleAdd"
          class="bg-[#EF972D] hover:bg-[#EF972D]/95 text-white px-6 py-2 rounded-lg font-label-sm text-label-sm uppercase flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap self-end md:self-auto cursor-pointer font-bold"
        >
          <span class="material-symbols-outlined" style="font-size: 18px;">add</span>
          {{ currentConfig.addBtnLabel }}
        </button>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto border border-outline-variant/30 rounded-lg relative">
        <!-- Loading overlay -->
        <div v-if="isLoading" class="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
          <div class="w-8 h-8 border-4 border-[#EF972D] border-t-transparent rounded-full animate-spin"></div>
        </div>

        <table class="w-full text-left border-collapse">
          <thead class="bg-gray-50 border-b border-outline-variant/30">
            <tr>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider w-[60px] text-center">STT</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{{ currentConfig.codeLabel }}</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{{ currentConfig.nameLabel }}</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Ngày tạo</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-center">Trạng thái</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-center w-[120px]">Hành động</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/20 font-body-md text-body-md">
            <tr
              v-for="(item, idx) in items"
              :key="item.id"
              class="hover:bg-gray-50/50 transition-colors group"
            >
              <td class="py-4 px-4 text-center text-on-surface-variant">{{ idx + 1 + currentPage * pageSize }}</td>
              <td class="py-4 px-4 font-medium">{{ item.code }}</td>
              <td class="py-4 px-4">{{ item.name }}</td>
              <td class="py-4 px-4 text-on-surface-variant">{{ item.date }}</td>
              <td class="py-4 px-4 text-center">
                <span
                  v-if="item.isActive"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200"
                >
                  Đang hoạt động
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200"
                >
                  Ngừng hoạt động
                </span>
              </td>
              <td class="py-4 px-4">
                <div class="flex items-center justify-center gap-3">
                  <!-- Visibility Icon -->
                  <button
                    @click="showDetails(item)"
                    class="text-on-surface-variant hover:text-[#EF972D] transition-colors p-1 cursor-pointer flex items-center justify-center"
                    title="Chi tiết"
                  >
                    <span class="material-symbols-outlined" style="font-size: 20px;">visibility</span>
                  </button>

                  <!-- Toggle switch status -->
                  <label class="relative inline-flex items-center cursor-pointer" title="Đổi trạng thái">
                    <input
                      type="checkbox"
                      class="sr-only peer"
                      v-model="item.isActive"
                      @change="toggleStatus(item)"
                    />
                    <div class="relative w-9 h-5 bg-gray-300 rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
              </td>
            </tr>

            <!-- Empty result placeholder -->
            <tr v-if="items.length === 0 && !isLoading">
              <td colspan="6" class="py-8 text-center text-gray-500">
                <template v-if="fetchError">
                  Không kết nối được API ({{ currentConfig.apiPath }}). Hãy bật backend port 8080 và chạy lại
                  <code class="text-xs bg-gray-100 px-1 rounded">npm run dev</code>.
                </template>
                <template v-else>
                  Chưa có {{ currentConfig.itemName }} trong hệ thống.
                  Nhấn <strong>{{ currentConfig.addBtnLabel }}</strong> để thêm bản ghi đầu tiên.
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-between items-center mt-4">
        <span class="text-sm text-gray-500 font-body-md">
          Hiển thị {{ currentPage * pageSize + 1 }}-{{ Math.min((currentPage + 1) * pageSize, totalElements) }} của {{ totalElements }} thuộc tính
        </span>
        <div class="flex gap-1">
          <button
            @click="currentPage--"
            :disabled="currentPage === 0"
            class="w-8 h-8 flex items-center justify-center rounded-md border border-outline-variant/50 text-on-surface-variant hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <span class="material-symbols-outlined" style="font-size: 18px;">chevron_left</span>
          </button>
          
          <button
            v-for="pageNum in totalPages"
            :key="pageNum"
            @click="currentPage = pageNum - 1"
            :class="currentPage === pageNum - 1 ? 'bg-[#EF972D] text-white border-[#EF972D]' : 'border border-outline-variant/50 text-on-surface hover:bg-gray-50'"
            class="w-8 h-8 flex items-center justify-center rounded-md font-medium text-sm transition-colors cursor-pointer"
          >
            {{ pageNum }}
          </button>
          
          <button
            @click="currentPage++"
            :disabled="currentPage === totalPages - 1"
            class="w-8 h-8 flex items-center justify-center rounded-md border border-outline-variant/50 text-on-surface-variant hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <span class="material-symbols-outlined" style="font-size: 18px;">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Custom Modal UI for Adding New Attribute -->
  <div
    v-if="showAddModal"
    class="fixed inset-0 z-50 flex items-center justify-center"
  >
    <!-- Backdrop overlay -->
    <div
      @click="showAddModal = false"
      class="absolute inset-0 bg-[#0D2533]/40 backdrop-blur-sm transition-opacity"
    ></div>

    <!-- Modal Box -->
    <div
      class="relative bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full p-6 mx-4 transform transition-all flex flex-col gap-4 z-10 text-left"
    >
      <div class="flex items-center justify-between border-b border-gray-100 pb-3">
        <h3 class="text-lg font-bold text-[#0D2533]">
          {{ currentConfig.addBtnLabel }}
        </h3>
        <button
          @click="showAddModal = false"
          class="text-gray-400 hover:text-gray-600 cursor-pointer flex items-center justify-center"
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-semibold text-[#0D2533]">
          Tên {{ currentConfig.itemName }} mới
        </label>
        <input
          v-model="newAttributeName"
          type="text"
          class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] text-base transition-all font-body-md focus:outline-none"
          :placeholder="`Nhập tên ${currentConfig.itemName} mới...`"
          @keyup.enter="submitAdd"
          autofocus
        />
      </div>

      <div class="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
        <button
          @click="showAddModal = false"
          class="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all cursor-pointer"
        >
          Hủy
        </button>
        <button
          @click="submitAdd"
          class="px-6 py-2 bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-sm cursor-pointer"
        >
          Xác nhận
        </button>
      </div>
    </div>
  </div>

  <!-- Custom Modal UI for Details (With integrated inline Edit Mode) -->
  <div
    v-if="showDetailModal"
    class="fixed inset-0 z-50 flex items-center justify-center"
  >
    <!-- Backdrop overlay -->
    <div
      @click="showDetailModal = false"
      class="absolute inset-0 bg-[#0D2533]/40 backdrop-blur-sm transition-opacity"
    ></div>

    <!-- Modal Box -->
    <div
      class="relative bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full p-6 mx-4 transform transition-all flex flex-col gap-4 z-10 text-left"
    >
      <div class="flex items-center justify-between border-b border-gray-100 pb-3">
        <h3 class="text-lg font-bold text-[#0D2533]">
          {{ isEditingDetail ? `Cập nhật ${currentConfig.itemName}` : `Chi tiết ${currentConfig.itemName}` }}
        </h3>
        <button
          @click="showDetailModal = false"
          class="text-gray-400 hover:text-gray-600 cursor-pointer flex items-center justify-center"
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="space-y-3 py-2">
        <div class="flex items-center justify-between border-b border-gray-50 pb-2">
          <span class="text-sm text-gray-500">Mã {{ currentConfig.itemName }}:</span>
          <span class="font-semibold text-[#0D2533]">{{ selectedItem?.code }}</span>
        </div>

        <!-- Editable Name Row inside Modal -->
        <div class="flex flex-col gap-1 border-b border-gray-50 pb-2">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500">Tên {{ currentConfig.itemName }}:</span>
            <span v-if="!isEditingDetail" class="font-semibold text-[#EF972D]">{{ selectedItem?.name }}</span>
          </div>
          <input
            v-if="isEditingDetail"
            v-model="tempEditName"
            type="text"
            class="w-full mt-1.5 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] text-base transition-all font-body-md focus:outline-none"
            :placeholder="`Nhập tên ${currentConfig.itemName}...`"
            @keyup.enter="saveEditInDetail"
            autofocus
          />
        </div>

        <div class="flex items-center justify-between border-b border-gray-50 pb-2">
          <span class="text-sm text-gray-500">Ngày tạo:</span>
          <span class="text-[#0D2533]">{{ selectedItem?.date }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-500">Trạng thái:</span>
          <span
            :class="selectedItem?.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'"
            class="px-2.5 py-0.5 rounded-full text-xs font-semibold font-body-md"
          >
            {{ selectedItem?.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động' }}
          </span>
        </div>
      </div>

      <!-- Action buttons integrated directly inside modal -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
        <!-- Mode: View Details -->
        <template v-if="!isEditingDetail">
          <button
            @click="startEditInDetail"
            class="px-4 py-2 border border-blue-200 text-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-50 transition-all cursor-pointer flex items-center gap-1 font-body-md"
          >
            <span class="material-symbols-outlined text-[18px]">edit</span>
            Chỉnh sửa
          </button>
          <button
            @click="showDetailModal = false"
            class="px-5 py-2 bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-sm cursor-pointer"
          >
            Đóng
          </button>
        </template>

        <!-- Mode: Inline Editing -->
        <template v-else>
          <button
            @click="cancelEditInDetail"
            class="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all cursor-pointer"
          >
            Hủy
          </button>
          <button
            @click="saveEditInDetail"
            class="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer"
          >
            Lưu thay đổi
          </button>
        </template>
      </div>
    </div>
  </div>

  <!-- Custom Confirmation Modal -->
  <div v-if="confirmModal.show" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
    <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-scale-up text-left">
      <div class="p-6 space-y-4">
        <div class="flex items-center gap-3 border-b border-gray-100 pb-3">
          <span class="material-symbols-outlined text-[#ef972d] text-2xl">help</span>
          <h3 class="text-lg font-bold text-gray-800">{{ confirmModal.title }}</h3>
        </div>
        <p class="text-sm text-gray-600 leading-relaxed font-body-md">{{ confirmModal.message }}</p>
      </div>
      <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
        <button
          @click="handleCancelAction"
          class="px-5 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
        >
          Hủy bỏ
        </button>
        <button
          @click="handleConfirm"
          class="px-5 py-2 bg-gradient-to-r from-[#FFB74D] to-[#EF972D] hover:opacity-95 text-white rounded-lg text-sm font-semibold shadow-sm transition-all cursor-pointer"
        >
          Xác nhận
        </button>
      </div>
    </div>
  </div>

  <!-- Custom Toast Notification -->
  <div
    v-if="toast.show"
    class="fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-3 border transition-all duration-300 animate-scale-up"
    :class="{
      'bg-emerald-50 border-emerald-200 text-emerald-800': toast.type === 'success',
      'bg-red-50 border-red-200 text-red-800': toast.type === 'error',
      'bg-amber-50 border-amber-200 text-amber-800': toast.type === 'info'
    }"
  >
    <span class="material-symbols-outlined text-lg">
      {{ toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info' }}
    </span>
    <span class="text-sm font-semibold font-body-md">{{ toast.message }}</span>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes scaleUp {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}
.animate-scale-up {
  animation: scaleUp 0.15s ease-out forwards;
}
</style>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../services/api'

const router = useRouter()

// Filter states
const searchQuery = ref('')
const startDate = ref('')
const endDate = ref('')
const orderType = ref('all') // 'all', '0' (Store), '1' (Online)
const selectedStatus = ref('0,1,2,3') // '0,1,2,3' (All active), 0, 1, 2, 3

// List state
const invoices = ref([])

// Loading, Error, Pagination states
const isLoading = ref(false)
const fetchError = ref(false)
const currentPage = ref(0)
const totalPages = ref(1)
const totalElements = ref(0)
const pageSize = ref(10)

// Toast message state
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

// Helpers
const formatPrice = (price) => {
  if (price === null || price === undefined) return '0đ'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(price)
    .replace(/\s?₫/, 'đ')
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    
    return `${day}/${month}/${year} ${hours}:${minutes}`
  } catch (e) {
    return dateString
  }
}

const getStatusBadgeClass = (status) => {
  const code = parseInt(status, 10)
  switch (code) {
    case 0: // Chưa xác nhận
      return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 1: // Đã xác nhận
      return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 2: // Chờ giao
      return 'bg-indigo-50 text-indigo-700 border border-indigo-200'
    case 3: // Đang giao
      return 'bg-orange-50 text-orange-700 border border-orange-200'
    case 4: // Đã hoàn thành
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 5: // Đã hủy
      return 'bg-red-50 text-red-700 border border-red-200'
    case 6: // Giao hàng không thành công
      return 'bg-rose-50 text-rose-700 border border-rose-200'
    default:
      return 'bg-gray-50 text-gray-700 border border-gray-200'
  }
}

const getStatusText = (status) => {
  const code = parseInt(status, 10)
  switch (code) {
    case 0: return 'Chưa xác nhận'
    case 1: return 'Đã xác nhận'
    case 2: return 'Chờ giao'
    case 3: return 'Đang giao'
    case 4: return 'Đã hoàn thành'
    case 5: return 'Đã hủy'
    case 6: return 'Giao hàng không thành công'
    default: return 'Không xác định'
  }
}

// Fetch invoices from API
const fetchInvoices = async (page = 0) => {
  isLoading.value = true
  fetchError.value = false
  currentPage.value = page

  try {
    const params = {
      page: page,
      size: pageSize.value,
    }

    if (searchQuery.value.trim()) {
      params.maHoaDon = searchQuery.value.trim()
    }

    if (startDate.value) {
      params.tuNgay = `${startDate.value}T00:00:00`
    }

    if (endDate.value) {
      params.denNgay = `${endDate.value}T23:59:59`
    }

    if (orderType.value !== 'all') {
      params.loaiDon = parseInt(orderType.value, 10)
    }

    if (selectedStatus.value && selectedStatus.value !== 'all') {
      params.trangThai = selectedStatus.value
    } else {
      params.trangThai = '0,1,2,3'
    }

    const res = await api.get('/api/v1/hoa-don', { params })
    const data = res.data

    if (data) {
      invoices.value = data.content || []
      totalPages.value = data.totalPages || 1
      totalElements.value = data.totalElements || 0
    } else {
      invoices.value = []
      totalPages.value = 1
      totalElements.value = 0
    }
  } catch (err) {
    console.error('Failed to load invoices list:', err)
    fetchError.value = true
    showToast('Không thể kết nối đến máy chủ để tải dữ liệu đơn hàng!', 'error')
  } finally {
    isLoading.value = false
  }
}

// Export excel with current filters
const handleExportExcel = async () => {
  try {
    const params = {}
    if (searchQuery.value.trim()) {
      params.maHoaDon = searchQuery.value.trim()
    }
    if (startDate.value) {
      params.tuNgay = `${startDate.value}T00:00:00`
    }
    if (endDate.value) {
      params.denNgay = `${endDate.value}T23:59:59`
    }
    if (orderType.value !== 'all') {
      params.loaiDon = parseInt(orderType.value, 10)
    }
    if (selectedStatus.value && selectedStatus.value !== 'all') {
      params.trangThai = selectedStatus.value
    } else {
      params.trangThai = '0,1,2,3'
    }

    const res = await api.get('/api/v1/hoa-don/export-excel', {
      params,
      responseType: 'blob'
    })

    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `danh_sach_don_hang_${new Date().toISOString().slice(0, 10)}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    showToast('Xuất file Excel thành công!', 'success')
  } catch (err) {
    console.error('Failed to export excel:', err)
    showToast('Không thể xuất file Excel, vui lòng thử lại sau!', 'error')
  }
}

// Reset filters
const resetFilters = () => {
  searchQuery.value = ''
  startDate.value = ''
  endDate.value = ''
  orderType.value = 'all'
  selectedStatus.value = '0,1,2,3'
  fetchInvoices(0)
}

// Navigation to details
const viewDetail = (id) => {
  router.push(`/invoices/${id}`)
}

// Watchers
watch(orderType, () => fetchInvoices(0))
watch(selectedStatus, () => fetchInvoices(0))
watch(startDate, () => fetchInvoices(0))
watch(endDate, () => fetchInvoices(0))

let searchTimeout = null
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchInvoices(0)
  }, 400)
})

// Pagination pages range
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
  fetchInvoices(0)
})
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-gutter">
    <!-- Header Section -->
    <div class="mb-stack-lg">
      <h1 class="font-display-lg text-on-surface uppercase text-gray-900 tracking-tight">QUẢN LÝ ĐƠN HÀNG</h1>
    </div>

    <!-- Filter Card -->
    <div class="bg-surface-container-lowest rounded-xl p-stack-lg shadow-sm border border-outline-variant flex flex-col gap-stack-md">
      <!-- Header -->
      <div class="flex items-center gap-base">
        <span class="material-symbols-outlined text-on-surface-variant text-xl">filter_alt</span>
        <h2 class="font-headline-md text-headline-md text-on-surface">Bộ lọc</h2>
      </div>

      <!-- Filters Grid -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-gutter">
        <!-- Search code -->
        <div class="flex flex-col gap-stack-sm">
          <label class="font-label-sm text-label-sm text-on-surface-variant uppercase">Mã hoặc Thông tin đơn hàng</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <span class="material-symbols-outlined text-[20px]">search</span>
            </span>
            <input
              v-model="searchQuery"
              class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-10 pr-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors"
              placeholder="Mã HD, tên, SĐT khách"
              type="text"
            />
          </div>
        </div>

        <!-- Start Date -->
        <div class="flex flex-col gap-stack-sm">
          <label class="font-label-sm text-label-sm text-on-surface-variant uppercase">Từ ngày</label>
          <input
            v-model="startDate"
            class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors"
            type="date"
          />
        </div>

        <!-- End Date -->
        <div class="flex flex-col gap-stack-sm">
          <label class="font-label-sm text-label-sm text-on-surface-variant uppercase">Đến ngày</label>
          <input
            v-model="endDate"
            class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors"
            type="date"
          />
        </div>

        <!-- Order Type -->
        <div class="flex flex-col gap-stack-sm">
          <label class="font-label-sm text-label-sm text-on-surface-variant uppercase">Loại đơn</label>
          <select
            v-model="orderType"
            class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors"
          >
            <option value="all">Tất cả</option>
            <option value="0">Tại quầy</option>
            <option value="1">Giao hàng</option>
            <option value="2">Online</option>
          </select>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end items-center gap-stack-md pt-stack-sm border-t border-gray-100 mt-2">
        <button
          @click="handleExportExcel"
          class="flex items-center gap-base px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors text-on-surface font-label-sm text-label-sm cursor-pointer shadow-sm"
        >
          <span class="material-symbols-outlined text-[18px]">download</span>
          Xuất Excel
        </button>
        <button
          @click="resetFilters"
          class="flex items-center gap-base px-4 py-2 bg-inverse-surface text-on-secondary rounded-lg hover:bg-on-surface transition-colors font-label-sm text-label-sm cursor-pointer shadow-sm"
        >
          <span class="material-symbols-outlined text-[18px]">restart_alt</span>
          Đặt lại bộ lọc
        </button>
      </div>
    </div>

    <!-- Order List Table Card -->
    <div class="bg-surface-container-lowest rounded-xl p-stack-lg shadow-sm border border-outline-variant flex flex-col gap-stack-lg">
      <!-- Header & Sorting -->
      <div class="flex justify-between items-start md:items-center flex-col md:flex-row gap-stack-md">
        <div class="flex items-start gap-stack-md">
          <div class="bg-surface-container p-2 rounded-lg flex items-center justify-center text-primary-container">
            <span class="material-symbols-outlined">receipt_long</span>
          </div>
          <div class="flex flex-col">
            <h2 class="font-headline-md text-headline-md text-on-surface">Danh sách đơn hàng</h2>
            <span class="font-body-md text-body-md text-on-surface-variant">Lọc nhanh theo trạng thái</span>
          </div>
        </div>
      </div>

      <!-- Quick Filter Tabs -->
      <div class="flex flex-wrap items-center gap-stack-sm">
        <button
          @click="selectedStatus = '0,1,2,3'"
          :class="selectedStatus === '0,1,2,3' ? 'bg-[#EF972D] text-white border-transparent' : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:border-primary-container hover:text-primary-container'"
          class="px-4 py-1.5 rounded-full font-label-sm text-label-sm transition-colors cursor-pointer"
        >
          Tất cả
        </button>
        <button
          @click="selectedStatus = 0"
          :class="selectedStatus === 0 ? 'bg-[#EF972D] text-white border-transparent' : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:border-primary-container hover:text-primary-container'"
          class="px-4 py-1.5 rounded-full font-label-sm text-label-sm transition-colors cursor-pointer"
        >
          Chưa xác nhận
        </button>
        <button
          @click="selectedStatus = 1"
          :class="selectedStatus === 1 ? 'bg-[#EF972D] text-white border-transparent' : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:border-primary-container hover:text-primary-container'"
          class="px-4 py-1.5 rounded-full font-label-sm text-label-sm transition-colors cursor-pointer"
        >
          Đã xác nhận
        </button>
        <button
          @click="selectedStatus = 2"
          :class="selectedStatus === 2 ? 'bg-[#EF972D] text-white border-transparent' : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:border-primary-container hover:text-primary-container'"
          class="px-4 py-1.5 rounded-full font-label-sm text-label-sm transition-colors cursor-pointer"
        >
          Chờ giao
        </button>
        <button
          @click="selectedStatus = 3"
          :class="selectedStatus === 3 ? 'bg-[#EF972D] text-white border-transparent' : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:border-primary-container hover:text-primary-container'"
          class="px-4 py-1.5 rounded-full font-label-sm text-label-sm transition-colors cursor-pointer"
        >
          Đang giao
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="p-10 flex flex-col items-center justify-center gap-3 bg-white border border-outline-variant rounded-lg">
        <div class="w-8 h-8 border-4 border-[#EF972D] border-t-transparent rounded-full animate-spin"></div>
        <span class="text-sm font-semibold text-gray-500">Đang tải danh sách đơn hàng...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="fetchError" class="p-10 text-center space-y-4 bg-white border border-outline-variant rounded-lg">
        <span class="material-symbols-outlined text-red-500 text-5xl">error</span>
        <p class="text-sm text-gray-500 font-medium">Đã có lỗi xảy ra khi tải dữ liệu từ máy chủ.</p>
        <button
          @click="fetchInvoices(0)"
          class="px-4 py-2 bg-[#EF972D] hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          Tải lại
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="invoices.length === 0" class="p-10 text-center bg-white border border-outline-variant rounded-lg">
        <span class="material-symbols-outlined text-gray-400 text-5xl">receipt_long</span>
        <p class="text-sm text-gray-500 font-medium mt-2">Không tìm thấy đơn hàng nào phù hợp.</p>
      </div>

      <!-- Table Section -->
      <div v-else class="overflow-x-auto border border-outline-variant rounded-lg">
        <table class="w-full text-left border-collapse min-w-[1000px]">
          <thead class="bg-surface-container-low border-b border-outline-variant">
            <tr>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap text-center w-16">STT</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap">Mã đơn hàng</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap">Nhân viên tạo</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap">Khách hàng</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap">Ngày tạo</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap">Tổng tiền</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap">Loại đơn</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap">SĐT</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap text-center">Trạng thái</th>
              <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase whitespace-nowrap text-center w-28">Hành động</th>
            </tr>
          </thead>
          <tbody class="bg-surface-container-lowest divide-y divide-outline-variant">
            <tr
              v-for="(item, index) in invoices"
              :key="item.id"
              class="hover:bg-surface-container-low transition-colors"
            >
              <td class="py-3.5 px-4 font-body-md text-body-md text-on-surface text-center">
                {{ index + 1 + currentPage * pageSize }}
              </td>
              <td class="py-3.5 px-4 font-body-md text-body-md text-on-surface font-semibold">
                {{ item.maHoaDon || item.ma || '-' }}
              </td>
              <td class="py-3.5 px-4 font-body-md text-body-md text-on-surface">
                {{ item.tenNhanVien || item.nhanVien || '' }}
              </td>
              <td class="py-3.5 px-4 font-body-md text-body-md text-on-surface">
                {{ item.tenKhachHang || item.khachHang || 'Khách lẻ' }}
              </td>
              <td class="py-3.5 px-4 font-body-md text-body-md text-on-surface-variant">
                {{ formatDate(item.ngayTao) }}
              </td>
              <td class="py-3.5 px-4 font-body-md text-body-md text-on-surface font-semibold">
                {{ formatPrice(item.tongTien) }}
              </td>
              <td class="py-3.5 px-4">
                <span
                  v-if="item.loaiDon === 0"
                  class="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide bg-gray-100 text-gray-800 border border-gray-200"
                >
                  Tại quầy
                </span>
                <span
                  v-else-if="item.loaiDon === 1"
                  class="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide bg-blue-100 text-blue-800 border border-blue-200"
                >
                  Giao hàng
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide bg-green-100 text-green-800 border border-green-200"
                >
                  Online
                </span>
              </td>
              <td class="py-3.5 px-4 font-body-md text-body-md text-on-surface">
                {{ item.soDienThoaiKhachHang || item.sdtKhachHang || item.soDienThoai || '-' }}
              </td>
              <td class="py-3.5 px-4 text-center">
                <span
                  :class="getStatusBadgeClass(item.trangThai)"
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                >
                  {{ getStatusText(item.trangThai) }}
                </span>
              </td>
              <td class="py-3.5 px-4 text-center">
                <button
                  @click="viewDetail(item.id)"
                  class="text-on-surface-variant hover:text-primary-container transition-colors cursor-pointer"
                  title="Xem chi tiết"
                >
                  <span class="material-symbols-outlined text-[20px]">visibility</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination and Counters -->
      <div v-if="totalPages > 1 && invoices.length > 0" class="flex justify-between items-center mt-2 flex-col sm:flex-row gap-4">
        <span class="font-body-md text-body-md text-on-surface-variant">
          Hiển thị {{ currentPage * pageSize + 1 }} đến {{ Math.min((currentPage + 1) * pageSize, totalElements) }} của {{ totalElements }} đơn hàng
        </span>

        <!-- Pagination Controls -->
        <div class="flex items-center space-x-1">
          <button
            @click="fetchInvoices(currentPage - 1)"
            :disabled="currentPage === 0"
            class="px-3 py-1 text-gray-500 hover:bg-gray-100 rounded-md transition-colors font-body-md text-sm border border-transparent disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            «
          </button>
          
          <button
            v-for="(page, idx) in visiblePages"
            :key="idx"
            @click="page !== '...' && fetchInvoices(page)"
            :class="page === currentPage ? 'bg-[#EF972D] text-white border-transparent' : 'text-gray-600 hover:bg-gray-100 border-transparent'"
            class="px-3 py-1 rounded-md font-body-md text-sm transition-colors border cursor-pointer"
            :disabled="page === '...'"
          >
            {{ page === '...' ? '...' : page + 1 }}
          </button>

          <button
            @click="fetchInvoices(currentPage + 1)"
            :disabled="currentPage === totalPages - 1"
            class="px-3 py-1 text-gray-500 hover:bg-gray-100 rounded-md transition-colors font-body-md text-sm border border-transparent disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            »
          </button>
        </div>
      </div>
      
      <!-- Single display count if only 1 page -->
      <div v-else-if="invoices.length > 0" class="flex justify-start">
        <span class="font-body-md text-body-md text-on-surface-variant">Hiển thị {{ totalElements }} đơn hàng</span>
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
input[type="date"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
}
</style>

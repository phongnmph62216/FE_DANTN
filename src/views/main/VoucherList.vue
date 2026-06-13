<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../services/api'

const router = useRouter()

// Filter states
const searchQuery = ref('')
const selectedApplyType = ref('all')
const selectedDiscountType = ref('all')
const fromDate = ref('')
const toDate = ref('')
const selectedStatus = ref('all')

// List state
const vouchers = ref([])

// Custom Modal & Toast States
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

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

// Pagination & Loading States
const isLoading = ref(false)
const fetchError = ref(false)
const currentPage = ref(0)
const totalPages = ref(1)
const totalElements = ref(0)
const pageSize = ref(10)

// Helper to format currency
const formatPrice = (price) => {
  if (price === null || price === undefined) return '0đ'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(price)
    .replace(/\s?₫/, 'đ')
}

// Helper to format dates
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch (e) {
    return dateString
  }
}

// Get dynamic display status details
const getStatusBadge = (item) => {
  if (item.trangThai === 0) {
    return {
      text: 'Sắp diễn ra',
      class: 'bg-blue-50 text-blue-700 border border-blue-100'
    }
  } else if (item.trangThai === 1) {
    return {
      text: 'Đang diễn ra',
      class: 'bg-green-50 text-green-700 border border-green-100'
    }
  } else if (item.trangThai === 2) {
    return {
      text: 'Đã kết thúc',
      class: 'bg-gray-100 text-gray-500 border border-gray-200'
    }
  }
  return {
    text: 'Không xác định',
    class: 'bg-gray-50 text-gray-400'
  }
}

// Main API fetcher
const fetchVouchers = async (page = 0) => {
  isLoading.value = true
  fetchError.value = false
  currentPage.value = page

  try {
    const params = {
      page: page,
      size: pageSize.value,
    }

    if (searchQuery.value.trim()) {
      params.keyword = searchQuery.value.trim()
    }

    // Discount Type filter
    if (selectedDiscountType.value !== 'all') {
      params.loaiGiam = parseInt(selectedDiscountType.value, 10)
    }

    // Status filter
    if (selectedStatus.value !== 'all') {
      params.trangThai = parseInt(selectedStatus.value, 10)
    }

    // Date filters (Format: YYYY-MM-DDTHH:mm:ss)
    if (fromDate.value) {
      params.tuNgay = `${fromDate.value}T00:00:00`
    }
    if (toDate.value) {
      params.denNgay = `${toDate.value}T23:59:59`
    }

    const res = await api.get('/api/v1/phieu-giam-gia', { params })
    const data = res.data

    if (data) {
      let content = data.content || []

      // Client-side sub-filtering for Apply Type (kieuApDung: 0 = Toàn cửa hàng, 1 = Cá nhân)
      if (selectedApplyType.value !== 'all') {
        const applyTypeVal = parseInt(selectedApplyType.value, 10)
        content = content.filter(item => item.kieuApDung === applyTypeVal)
      }

      vouchers.value = content
      totalPages.value = data.totalPages || 1
      totalElements.value = data.totalElements || 0
    }
  } catch (err) {
    console.error('Failed to load vouchers list:', err)
    fetchError.value = true
    showToast('Không thể kết nối đến máy chủ để tải dữ liệu!', 'error')
  } finally {
    isLoading.value = false
  }
}

// Watchers for filtering change
watch(selectedApplyType, () => fetchVouchers(0))
watch(selectedDiscountType, () => fetchVouchers(0))
watch(selectedStatus, () => fetchVouchers(0))
watch(fromDate, () => fetchVouchers(0))
watch(toDate, () => fetchVouchers(0))

// Debounced live search
let searchTimeout = null
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchVouchers(0)
  }, 400)
})

// Reset filters action
const resetFilters = () => {
  searchQuery.value = ''
  selectedApplyType.value = 'all'
  selectedDiscountType.value = 'all'
  fromDate.value = ''
  toDate.value = ''
  selectedStatus.value = 'all'
  fetchVouchers(0)
}

// Toggle status handler
const handleToggle = (item) => {
  const oldState = item.trangThai
  let actionText = ''

  if (oldState === 1) {
    actionText = 'ngừng kích hoạt'
  } else if (oldState === 2) {
    actionText = 'kích hoạt lại'
  } else if (oldState === 0) {
    actionText = 'ngừng kích hoạt (hủy)'
  }

  triggerConfirm(
    `Bạn có chắc chắn muốn ${actionText} phiếu giảm giá "${item.tenPhieuGiamGia}" không?`,
    async () => {
      try {
        const res = await api.patch(`/api/v1/phieu-giam-gia/${item.id}/status`)
        if (res._wrapper && res._wrapper.status && res._wrapper.status.includes('ERROR')) {
          showToast(`Đổi trạng thái thất bại: ${res._wrapper.message}`, 'error')
        } else {
          showToast(`Đã thay đổi trạng thái phiếu giảm giá thành công!`, 'success')
          await fetchVouchers(currentPage.value)
        }
      } catch (err) {
        console.error('Failed to patch status:', err)
        const errMsg = err.response?.data?.message || 'Thay đổi trạng thái thất bại, vui lòng thử lại sau!'
        showToast(errMsg, 'error')
      }
    },
    'Thay đổi trạng thái phiếu giảm giá'
  )
}

// Add/Edit action placeholders
const addVoucher = () => {
  router.push('/vouchers/create')
}

const editVoucher = (item) => {
  router.push(`/vouchers/edit/${item.id}`)
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
  fetchVouchers(0)
})
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-gutter">
    <!-- Header Section -->
    <div class="mb-stack-lg">
      <h1 class="font-display-lg text-on-surface uppercase text-gray-900 tracking-tight">QUẢN LÝ PHIẾU GIẢM GIÁ</h1>
    </div>

    <!-- Filter Card -->
    <div class="bg-surface-container-lowest rounded-lg shadow-sm border border-gray-100 p-container-padding">
      <!-- Row 1: Search -->
      <div class="mb-gutter">
        <div class="relative w-full">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <span class="material-symbols-outlined text-[20px]">search</span>
          </span>
          <input
            v-model="searchQuery"
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange transition-colors font-body-md text-on-surface placeholder-gray-400 bg-white"
            placeholder="Tìm theo mã hoặc tên PGG"
            type="text"
          />
        </div>
      </div>

      <!-- Row 2: Filters and Actions -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-gutter">
        <div class="flex flex-wrap items-center gap-base flex-1">
          <!-- Apply Type -->
          <select
            v-model="selectedApplyType"
            class="border border-gray-300 rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange font-body-md bg-white text-gray-700 min-w-[140px]"
          >
            <option value="all">Kiểu áp dụng</option>
            <option value="1">Cá nhân</option>
            <option value="0">Toàn cửa hàng</option>
          </select>

          <!-- Discount Type -->
          <select
            v-model="selectedDiscountType"
            class="border border-gray-300 rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange font-body-md bg-white text-gray-700 min-w-[140px]"
          >
            <option value="all">Loại giảm</option>
            <option value="0">Phần trăm</option>
            <option value="1">Số tiền cố định</option>
          </select>

          <!-- Start Date -->
          <div class="relative min-w-[140px]">
            <input
              v-model="fromDate"
              class="w-full border border-gray-300 rounded-lg py-2 pl-3 pr-4 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange font-body-md bg-white text-gray-700"
              placeholder="Ngày bắt đầu"
              type="date"
            />
          </div>

          <!-- End Date -->
          <div class="relative min-w-[140px]">
            <input
              v-model="toDate"
              class="w-full border border-gray-300 rounded-lg py-2 pl-3 pr-4 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange font-body-md bg-white text-gray-700"
              placeholder="Ngày kết thúc"
              type="date"
            />
          </div>

          <!-- Status -->
          <select
            v-model="selectedStatus"
            class="border border-gray-300 rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange font-body-md bg-white text-gray-700 min-w-[140px]"
          >
            <option value="all">Trạng thái</option>
            <option value="1">Đang diễn ra</option>
            <option value="0">Sắp diễn ra</option>
            <option value="2">Đã kết thúc</option>
          </select>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-base">
          <button
            @click="resetFilters"
            class="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors flex items-center justify-center bg-white cursor-pointer"
            title="Reset Filters"
          >
            <span class="material-symbols-outlined text-[20px]">refresh</span>
          </button>
          <button
            @click="addVoucher"
            class="bg-[#EF972D] hover:bg-orange-600 text-white font-headline-md text-sm px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap font-medium shadow-sm cursor-pointer"
          >
            <span class="material-symbols-outlined text-[18px]">add</span>
            Thêm phiếu giảm giá
          </button>
        </div>
      </div>
    </div>

    <!-- Data Table Card -->
    <div class="bg-surface-container-lowest rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div v-if="isLoading" class="p-10 flex flex-col items-center justify-center gap-3 bg-white">
        <div class="w-8 h-8 border-4 border-[#EF972D] border-t-transparent rounded-full animate-spin"></div>
        <span class="text-sm font-semibold text-gray-500">Đang tải dữ liệu...</span>
      </div>

      <div v-else-if="fetchError" class="p-10 text-center space-y-4 bg-white">
        <span class="material-symbols-outlined text-red-500 text-5xl">error</span>
        <p class="text-sm text-gray-500 font-medium">Đã có lỗi xảy ra khi tải dữ liệu từ máy chủ.</p>
        <button
          @click="fetchVouchers(0)"
          class="px-4 py-2 bg-[#EF972D] hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          Tải lại
        </button>
      </div>

      <div v-else-if="vouchers.length === 0" class="p-10 text-center bg-white">
        <span class="material-symbols-outlined text-gray-400 text-5xl">search_off</span>
        <p class="text-sm text-gray-500 font-medium mt-2">Không tìm thấy phiếu giảm giá nào phù hợp.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-200">
              <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider text-center w-16">STT</th>
              <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider">Mã</th>
              <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider">Tên</th>
              <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider">Kiểu áp dụng</th>
              <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider">Chi tiết ưu đãi</th>
              <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider">Thời gian áp dụng</th>
              <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider">Số lượng</th>
              <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider text-right w-32">Hành động</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 bg-white">
            <tr
              v-for="(item, index) in vouchers"
              :key="item.id"
              :class="{'opacity-75': item.trangThai === 2}"
              class="hover:bg-gray-50/50 transition-colors"
            >
              <td class="py-4 px-4 font-body-md text-gray-600 text-center">
                {{ index + 1 + currentPage * pageSize }}
              </td>
              <td class="py-4 px-4 font-body-md font-medium text-gray-900">
                {{ item.maPhieuGiamGia }}
              </td>
              <td class="py-4 px-4 font-body-md text-gray-800">
                {{ item.tenPhieuGiamGia }}
              </td>
              <td class="py-4 px-4">
                <span
                  :class="item.kieuApDung === 1 ? 'bg-yellow-50 text-brand-orange border border-yellow-100' : 'bg-orange-50 text-orange-700 border border-orange-100'"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                >
                  {{ item.kieuApDung === 1 ? 'Cá nhân' : 'Toàn cửa hàng' }}
                </span>
              </td>
              <td class="py-4 px-4">
                <div class="flex flex-col">
                  <span class="font-bold text-brand-orange font-body-md">
                    {{ item.loaiGiam === 0 ? `Giảm ${item.giaTri}%` : `Giảm ${formatPrice(item.giaTri)}` }}
                  </span>
                  <span v-if="item.loaiGiam === 0 && item.giaGiamToiDa" class="text-xs text-gray-400 mt-0.5">
                    Tối đa: {{ formatPrice(item.giaGiamToiDa) }}
                  </span>
                  <span class="text-xs text-gray-400">
                    Đơn từ: {{ formatPrice(item.dieuKienGiam) }}
                  </span>
                </div>
              </td>
              <td class="py-4 px-4 font-body-md text-gray-600">
                <div class="flex flex-col">
                  <span>Từ: {{ formatDate(item.ngayBatDau) }}</span>
                  <span>Đến: {{ formatDate(item.ngayKetThuc) }}</span>
                </div>
              </td>
              <td class="py-4 px-4 font-body-md text-gray-600">
                {{ item.soLuongDaDung || 0 }} / {{ item.soLuong }}
              </td>
              <td class="py-4 px-4">
                <span
                  :class="getStatusBadge(item).class"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                >
                  {{ getStatusBadge(item).text }}
                </span>
              </td>
              <td class="py-4 px-4 text-right">
                <div class="flex items-center justify-end gap-3">
                  <!-- Toggle Switch -->
                  <div class="relative inline-block w-10 mr-2 align-middle select-none">
                    <input
                      :id="'toggle-' + item.id"
                      :checked="item.trangThai === 1"
                      @change="handleToggle(item)"
                      class="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer opacity-0"
                      type="checkbox"
                    />
                    <label
                      :for="'toggle-' + item.id"
                      class="toggle-label block overflow-hidden h-5 rounded-full bg-gray-300 cursor-pointer"
                    ></label>
                  </div>

                  <!-- Edit Action -->
                  <button
                    @click="editVoucher(item)"
                    class="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    title="Chỉnh sửa"
                  >
                    <span class="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1 && vouchers.length > 0" class="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between">
        <div class="text-sm text-gray-500 font-body-md">
          Hiển thị {{ currentPage * pageSize + 1 }} đến {{ Math.min((currentPage + 1) * pageSize, totalElements) }} của {{ totalElements }} kết quả
        </div>
        <div class="flex items-center space-x-1">
          <button
            @click="fetchVouchers(currentPage - 1)"
            :disabled="currentPage === 0"
            class="px-3 py-1 text-gray-500 hover:bg-gray-100 rounded-md transition-colors font-body-md text-sm border border-transparent disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            «
          </button>

          <button
            v-for="(page, idx) in visiblePages"
            :key="idx"
            @click="page !== '...' && fetchVouchers(page)"
            :class="page === currentPage ? 'bg-brand-orange text-white' : 'text-gray-600 hover:bg-gray-100 border-transparent'"
            class="px-3 py-1 rounded-md font-body-md text-sm transition-colors border cursor-pointer"
            :disabled="page === '...'"
          >
            {{ page === '...' ? '...' : page + 1 }}
          </button>

          <button
            @click="fetchVouchers(currentPage + 1)"
            :disabled="currentPage === totalPages - 1"
            class="px-3 py-1 text-gray-500 hover:bg-gray-100 rounded-md transition-colors font-body-md text-sm border border-transparent disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            »
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Custom Confirmation Modal -->
  <div v-if="confirmModal.show" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white text-[#0D2533] rounded-xl max-w-md w-full overflow-hidden border border-gray-100 shadow-2xl">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
        <span class="material-symbols-outlined text-[#EF972D] text-2xl">help_outline</span>
        <h3 class="font-headline-sm text-base font-bold text-gray-800">{{ confirmModal.title }}</h3>
      </div>
      <div class="p-6 text-sm font-medium text-gray-600 font-body-md leading-relaxed">
        {{ confirmModal.message }}
      </div>
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
        <button
          type="button"
          @click="confirmModal.show = false"
          class="border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          @click="handleConfirm"
          class="bg-[#EF972D] hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer shadow-sm"
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
.toggle-checkbox:checked { right: 0; border-color: #EF4444; }
.toggle-checkbox:checked + .toggle-label { background-color: #EF4444; }
.toggle-checkbox { right: 0; z-index: 1; border-color: #e2e8f0; transition: all 0.3s; }
.toggle-label { width: 2.5rem; height: 1.25rem; background-color: #cbd5e1; border-radius: 9999px; cursor: pointer; transition: all 0.3s; position: relative; display: block; }
.toggle-label::after { content: ''; position: absolute; top: 0.125rem; left: 0.125rem; width: 1rem; height: 1rem; background-color: white; border-radius: 50%; transition: all 0.3s; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.toggle-checkbox:checked + .toggle-label::after { transform: translateX(1.25rem); }

/* Custom Date input picker indicator styles */
input[type="date"]::-webkit-calendar-picker-indicator {
  background: transparent;
  bottom: 0;
  color: transparent;
  cursor: pointer;
  height: auto;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
  width: auto;
}
</style>
